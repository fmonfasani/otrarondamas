// Capacity test (Owner, 2026-11-26) — simulates customers chatting with their stores against the
// ISOLATED load-test API, in steps (50, 100, 200…), until it answers slowly or fails. Each
// virtual customer keeps the chat's realtime connection open (like a person with the screen open),
// writes a message every ~30 s and reloads the chat; two team members per store read the inbox
// and answer. Guards production: before and during each step it checks the real API's health and
// the server's load, and stops everything if production suffers.
//
// Runs inside the API builder image (socket.io-client, jsonwebtoken), with the host network so
// it reaches both the load-test API (LT_API) and production's health (PROD_HEALTH).
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';

const require = createRequire('/repo/apps/api/package.json');
const { io } = require('socket.io-client');
const jwt = require('jsonwebtoken');

const API = process.env.LT_API ?? 'http://127.0.0.1:8700';
const PROD_HEALTH = process.env.PROD_HEALTH ?? 'http://127.0.0.1:8600/health';
const STEPS = (process.env.LT_STEPS ?? '50,100,200,400,800,1600').split(',').map(Number);
const STEP_MS = Number(process.env.LT_STEP_SECONDS ?? 120) * 1000;
const MESSAGE_EVERY_MS = Number(process.env.LT_MESSAGE_EVERY_SECONDS ?? 30) * 1000;
const OUT = process.env.OUT ?? '/out';
const SECRET = process.env.JWT_SECRET;
if (!SECRET) throw new Error('JWT_SECRET (the load-test one) is required');
if (/:8600\b/.test(API)) throw new Error('LT_API must be the load-test API, never production');

// What makes a step «too slow» (the capacity), and when production asks us to stop.
const SLOW_P95_MS = 1000;
const MAX_ERROR_RATE = 0.01;
const PROD_SLOW_MS = 1000;
const cores = Number(readFileSync('/proc/cpuinfo', 'utf8').match(/^processor/gm)?.length ?? 1);

const seed = JSON.parse(readFileSync(`${OUT}/seed.json`, 'utf8'));
const sign = (payload) =>
  jwt.sign({ ...payload, permisos: [], estadoLegajo: 'APROBADO', mfa: true }, SECRET, { algorithm: 'HS256', expiresIn: '2h' });
const customers = seed.businesses.flatMap((b) =>
  b.customers.map((c) => ({
    slug: b.slug,
    token: sign({ sub: c.id, email: c.email, nombre: c.nombre, empresaId: b.id, rol: 'OWNER', type: 'cliente' }),
  })),
);
const owners = seed.businesses.flatMap((b) =>
  b.owners.map((o) => ({ token: sign({ sub: o.usuarioId, email: o.email, nombre: o.nombre, empresaId: b.id, rol: o.rol, type: 'usuario' }) })),
);

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jitter = (ms) => ms * (0.5 + Math.random());

// ------------------------------------------------------------------ measuring
let samples = []; // { op, ms, ok }
function record(op, ms, ok) {
  samples.push({ op, ms, ok });
}
async function call(op, token, path, init = {}) {
  const started = performance.now();
  try {
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
      signal: AbortSignal.timeout(15000),
    });
    const body = res.headers.get('content-type')?.includes('json') ? await res.json() : null;
    record(op, performance.now() - started, res.ok);
    return res.ok ? body : null;
  } catch {
    record(op, performance.now() - started, false);
    return null;
  }
}
const pct = (sorted, p) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)] : 0);
function summary(list) {
  const times = list.map((s) => s.ms).sort((a, b) => a - b);
  const errors = list.filter((s) => !s.ok).length;
  return {
    pedidos: list.length,
    errores: errors,
    errorPct: list.length ? Math.round((errors / list.length) * 1000) / 10 : 0,
    p50Ms: Math.round(pct(times, 0.5)),
    p95Ms: Math.round(pct(times, 0.95)),
    p99Ms: Math.round(pct(times, 0.99)),
  };
}

// ------------------------------------------------------------------ production's guard
const prod = { checks: [], slowInARow: 0, stop: null };
async function guard() {
  const started = performance.now();
  let ok = false;
  try {
    ok = (await fetch(PROD_HEALTH, { signal: AbortSignal.timeout(5000) })).ok;
  } catch {
    ok = false;
  }
  const ms = performance.now() - started;
  const load1 = Number(readFileSync('/proc/loadavg', 'utf8').split(' ')[0]);
  prod.checks.push({ ms, ok, load1 });
  prod.slowInARow = !ok || ms > PROD_SLOW_MS ? prod.slowInARow + 1 : 0;
  if (prod.slowInARow >= 2) prod.stop = `la API real tardó o falló 2 veces seguidas (${Math.round(ms)} ms)`;
  if (load1 > cores * 1.5) prod.stop = `el servidor quedó saturado (carga ${load1} con ${cores} procesadores)`;
}

// ------------------------------------------------------------------ virtual people
let running = true;
const sockets = { connected: 0, failed: 0 };

async function customer(c, firstDelay) {
  const socket = io(`${API}/messaging`, {
    auth: { token: c.token },
    transports: ['websocket'],
    reconnection: false,
    timeout: 10000,
  });
  const started = performance.now();
  socket.on('connect', () => {
    sockets.connected += 1;
    record('conectar', performance.now() - started, true);
  });
  socket.on('connect_error', () => {
    sockets.failed += 1;
    record('conectar', performance.now() - started, false);
  });
  socket.on('disconnect', () => {
    sockets.connected = Math.max(0, sockets.connected - 1);
  });
  await sleep(firstDelay);
  let n = 0;
  while (running) {
    n += 1;
    await call('enviar mensaje', c.token, `/${c.slug}/tienda/chat/mensajes`, {
      method: 'POST',
      body: JSON.stringify({ clientMessageId: `lt-${Math.random().toString(36).slice(2)}-${n}`, content: `Hola, ¿tienen stock? (${n})` }),
    });
    await call('abrir chat (cliente)', c.token, `/${c.slug}/tienda/chat`);
    await sleep(jitter(MESSAGE_EVERY_MS));
  }
  socket.close();
}

async function owner(o, firstDelay) {
  const socket = io(`${API}/messaging`, { auth: { token: o.token }, transports: ['websocket'], reconnection: false });
  await sleep(firstDelay);
  while (running) {
    const inbox = await call('bandeja (equipo)', o.token, '/messaging/conversations');
    const pending = Array.isArray(inbox) ? inbox.filter((c) => c.unreadCount > 0) : [];
    if (pending.length) {
      const chat = pending[Math.floor(Math.random() * pending.length)];
      const messages = await call('abrir chat (equipo)', o.token, `/messaging/conversations/${chat.id}/messages`);
      const last = Array.isArray(messages) ? messages.at(-1) : null;
      if (last) await call('marcar leído', o.token, `/messaging/conversations/${chat.id}/messages/${last.id}/read`, { method: 'POST' });
      await call('responder', o.token, `/messaging/conversations/${chat.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ clientMessageId: `lt-o-${Math.random().toString(36).slice(2)}`, content: 'Sí, tenemos. ¿Te lo reservo?' }),
      });
    }
    await sleep(jitter(10000));
  }
  socket.close();
}

// ------------------------------------------------------------------ the steps
const results = { inicio: new Date().toISOString(), procesadores: cores, escalones: [], capacidad: null, frenado: null };
const workers = [];
for (const o of owners) workers.push(owner(o, Math.random() * 10000));
let started = 0;
await guard();
if (prod.stop) {
  results.frenado = `No arrancó: ${prod.stop}`;
} else {
  for (const level of STEPS) {
    if (level > customers.length) break;
    // Spread the newcomers over 30 s so they do not all knock at once.
    while (started < level) {
      workers.push(customer(customers[started], Math.random() * Math.min(30000, MESSAGE_EVERY_MS)));
      started += 1;
    }
    log(`escalón: ${level} clientes`);
    samples = [];
    prod.checks = [];
    const end = Date.now() + STEP_MS;
    while (Date.now() < end && !prod.stop) {
      await sleep(10000);
      await guard();
    }
    // The second half of the step: everyone already connected and talking.
    const settled = samples.slice(Math.floor(samples.length / 3));
    const byOp = {};
    for (const s of settled) (byOp[s.op] ??= []).push(s);
    const all = summary(settled.filter((s) => s.op !== 'conectar'));
    const step = {
      clientes: level,
      conectados: sockets.connected,
      conexionesFallidas: sockets.failed,
      pedidosPorSegundo: Math.round((settled.length / (STEP_MS / 1000)) * 1.5 * 10) / 10,
      total: all,
      porTipo: Object.fromEntries(Object.entries(byOp).map(([op, list]) => [op, summary(list)])),
      produccion: {
        saludP95Ms: Math.round(pct(prod.checks.map((c) => c.ms).sort((a, b) => a - b), 0.95)),
        cargaMax: Math.max(0, ...prod.checks.map((c) => c.load1)),
      },
    };
    results.escalones.push(step);
    log(JSON.stringify({ clientes: level, p95: all.p95Ms, errores: all.errorPct, conectados: sockets.connected, carga: step.produccion.cargaMax }));
    if (prod.stop) {
      results.frenado = `Frenado para cuidar producción: ${prod.stop}`;
      break;
    }
    if (all.p95Ms > SLOW_P95_MS || all.errorPct / 100 > MAX_ERROR_RATE) {
      results.limite = { clientes: level, motivo: all.p95Ms > SLOW_P95_MS ? `respuestas lentas (95 % en ${all.p95Ms} ms)` : `errores (${all.errorPct} %)` };
      break;
    }
  }
}
running = false;
const good = results.escalones.filter((s) => s.total.p95Ms <= SLOW_P95_MS && s.total.errorPct / 100 <= MAX_ERROR_RATE);
results.capacidad = good.at(-1) ?? null;
results.fin = new Date().toISOString();
writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
const last = results.capacidad;
const lines = [
  `Prueba de capacidad del chat — ${results.inicio}`,
  last
    ? `Aguantó ${last.clientes} clientes chateando a la vez: el 95 % de las respuestas en ${last.total.p95Ms} ms, ${last.total.errorPct} % de errores, ${last.pedidosPorSegundo} pedidos por segundo.`
    : 'No llegó a un escalón con respuestas rápidas.',
  results.limite ? `Límite: con ${results.limite.clientes} clientes, ${results.limite.motivo}.` : 'No se alcanzó el límite con los escalones probados.',
  results.frenado ? results.frenado : 'Producción no se vio afectada (la prueba no tuvo que frenar).',
  '',
  ...results.escalones.map(
    (s) =>
      `${String(s.clientes).padStart(5)} clientes · 95 % ${String(s.total.p95Ms).padStart(5)} ms · mitad ${String(s.total.p50Ms).padStart(4)} ms · errores ${s.total.errorPct} % · ${s.pedidosPorSegundo} ped/s · conectados ${s.conectados} · API real ${s.produccion.saludP95Ms} ms · carga máx ${s.produccion.cargaMax}`,
  ),
];
writeFileSync(`${OUT}/resumen.txt`, `${lines.join('\n')}\n`);
console.log(lines.join('\n'));
setTimeout(() => process.exit(0), 3000).unref();
