import { useEffect, useMemo, useState } from 'react';
import type {
  ReglaFidelizacion,
  NivelFidelidad,
  Familia,
  Subfamilia,
  Tipo,
  Subtipo,
} from '@otrarondamas/shared-types';
import { api, ApiError } from '../../lib/api';

const NIVEL_LABEL: Record<NivelFidelidad, string> = {
  NUEVO: 'Nuevo',
  FRECUENTE: 'Frecuente',
  VIP: 'VIP',
};

const NIVELES: NivelFidelidad[] = ['NUEVO', 'FRECUENTE', 'VIP'];

interface FormState {
  nombre: string;
  nivelRequerido: NivelFidelidad;
  descuentoPorcentaje: string;
  familiaId: string;
  subfamiliaId: string;
  tipoId: string;
  subtipoId: string;
  marca: string;
  cantidadMinima: string;
}

const FORM_VACIO: FormState = {
  nombre: '',
  nivelRequerido: 'NUEVO',
  descuentoPorcentaje: '',
  familiaId: '',
  subfamiliaId: '',
  tipoId: '',
  subtipoId: '',
  marca: '',
  cantidadMinima: '',
};

/**
 * Fase 4 del roadmap de Fidelización: CRUD de ReglaFidelizacion — combina
 * un nivel (calculado por ClientesService.calcularNivel(), Fase 3) con un
 * descuento y un alcance opcional por jerarquía de catálogo (Familia →
 * Subfamilia → Tipo → Subtipo, ver la sesión de definición de catálogo),
 * más marca y cantidad mínima. Sin aplicación automática en la venta
 * todavía — eso es la Fase 5 (VentasService/TiendaService).
 *
 * A diferencia del selector de Producto (donde los 4 niveles son
 * obligatorios y deben encadenar), acá cada nivel es un filtro de
 * alcance INDEPENDIENTE: se puede elegir solo Familia (toda la Familia),
 * Familia+Subfamilia (solo esa Subfamilia), o los 4 (un Subtipo
 * puntual) — ver fidelizacion.service.ts. El selector en cascada solo
 * acota las OPCIONES de cada <select> siguiente (para no ofrecer una
 * Subfamilia de otra Familia), no obliga a completarlos todos.
 *
 * El frontend no oculta el formulario según permiso (mismo criterio que
 * ClientesPage/CajaPage/InventarioPage) — el backend rechaza con 403 si
 * falta fidelizacion.gestionar.
 */
export function FidelizacionPage() {
  const [reglas, setReglas] = useState<ReglaFidelizacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [familias, setFamilias] = useState<Familia[]>([]);
  const [subfamilias, setSubfamilias] = useState<Subfamilia[]>([]);
  const [tipos, setTipos] = useState<Tipo[]>([]);
  const [subtipos, setSubtipos] = useState<Subtipo[]>([]);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  useEffect(() => {
    // cargando arranca en true (estado inicial) — no hace falta
    // volver a setearlo acá, esto es una carga única al montar, sin
    // debounce (a diferencia de ClientesPage/PreciosPage, que sí lo
    // reactivan en cada tecla de búsqueda).
    api
      .listarReglasFidelizacion()
      .then((data) => {
        setReglas(data);
        setError(null);
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar las reglas'),
      )
      .finally(() => setCargando(false));

    // El árbol de categorización es chico (11 Familias, ~187
    // Subfamilias) y no cambia mientras se edita el formulario — se
    // trae una sola vez al entrar a la página, no en cada tecla.
    api
      .jerarquiaCatalogo()
      .then((data) => {
        setFamilias(data.familias);
        setSubfamilias(data.subfamilias);
        setTipos(data.tipos);
        setSubtipos(data.subtipos);
      })
      .catch(() => {
        // Sin la jerarquía, el formulario sigue funcionando (nombre +
        // nivel + descuento son obligatorios y no dependen de esto) —
        // simplemente los selectores de alcance por categoría quedan
        // vacíos, no se bloquea toda la página por esto.
      });
  }, []);

  // Cascada: cada selector siguiente solo ofrece las opciones que
  // cuelgan del nivel elegido arriba — evita que el formulario permita
  // armar una combinación que el backend después rechazaría (ver
  // verificarNivelesCatalogo, que sí las valida contra la base).
  const subfamiliasDisponibles = useMemo(
    () => (form.familiaId ? subfamilias.filter((s) => s.familiaId === form.familiaId) : []),
    [subfamilias, form.familiaId],
  );
  const tiposDisponibles = useMemo(
    () => (form.subfamiliaId ? tipos.filter((t) => t.subfamiliaId === form.subfamiliaId) : []),
    [tipos, form.subfamiliaId],
  );
  const subtiposDisponibles = useMemo(
    () => (form.tipoId ? subtipos.filter((s) => s.tipoId === form.tipoId) : []),
    [subtipos, form.tipoId],
  );

  function iniciarAlta() {
    setEditandoId('nuevo');
    setForm(FORM_VACIO);
    setErrorForm(null);
  }

  function iniciarEdicion(regla: ReglaFidelizacion) {
    setEditandoId(regla.id);
    setForm({
      nombre: regla.nombre,
      nivelRequerido: regla.nivelRequerido,
      descuentoPorcentaje: regla.descuentoPorcentaje,
      familiaId: regla.familiaId ?? '',
      subfamiliaId: regla.subfamiliaId ?? '',
      tipoId: regla.tipoId ?? '',
      subtipoId: regla.subtipoId ?? '',
      marca: regla.marca ?? '',
      cantidadMinima: regla.cantidadMinima != null ? String(regla.cantidadMinima) : '',
    });
    setErrorForm(null);
  }

  function cancelarEdicion() {
    setEditandoId(null);
    setErrorForm(null);
  }

  // Elegir una Familia distinta invalida cualquier Subfamilia/Tipo/
  // Subtipo ya elegido (podrían pertenecer a la Familia anterior) — se
  // limpian en cascada hacia abajo, mismo criterio en cada nivel.
  function cambiarFamilia(familiaId: string) {
    setForm((prev) => ({ ...prev, familiaId, subfamiliaId: '', tipoId: '', subtipoId: '' }));
  }
  function cambiarSubfamilia(subfamiliaId: string) {
    setForm((prev) => ({ ...prev, subfamiliaId, tipoId: '', subtipoId: '' }));
  }
  function cambiarTipo(tipoId: string) {
    setForm((prev) => ({ ...prev, tipoId, subtipoId: '' }));
  }

  async function guardar() {
    if (!form.nombre.trim()) {
      setErrorForm('El nombre es obligatorio');
      return;
    }
    const descuento = Number(form.descuentoPorcentaje);
    if (form.descuentoPorcentaje.trim() === '' || Number.isNaN(descuento)) {
      setErrorForm('El % de descuento es obligatorio');
      return;
    }
    if (descuento < 0 || descuento > 100) {
      setErrorForm('El % de descuento debe estar entre 0 y 100');
      return;
    }
    setGuardando(true);
    setErrorForm(null);
    const dto = {
      nombre: form.nombre.trim(),
      nivelRequerido: form.nivelRequerido,
      descuentoPorcentaje: descuento,
      familiaId: form.familiaId || undefined,
      subfamiliaId: form.subfamiliaId || undefined,
      tipoId: form.tipoId || undefined,
      subtipoId: form.subtipoId || undefined,
      marca: form.marca.trim() || undefined,
      cantidadMinima: form.cantidadMinima.trim() ? Number(form.cantidadMinima) : undefined,
    };
    try {
      if (editandoId === 'nuevo') {
        const creada = await api.crearReglaFidelizacion(dto);
        setReglas((prev) => [creada, ...prev]);
      } else if (editandoId) {
        const actualizada = await api.actualizarReglaFidelizacion(editandoId, dto);
        setReglas((prev) => prev.map((r) => (r.id === editandoId ? actualizada : r)));
      }
      setEditandoId(null);
    } catch (err) {
      setErrorForm(err instanceof ApiError ? err.message : 'No se pudo guardar la regla');
    } finally {
      setGuardando(false);
    }
  }

  function alcanceTexto(regla: ReglaFidelizacion): string {
    // Solo el nivel más específico indicado — no tiene sentido mostrar
    // "Almacén > Aceites" si de última apuntan al mismo Subtipo.
    const partes: string[] = [];
    if (regla.familia) partes.push(regla.familia.nombre);
    if (regla.subfamilia) partes.push(regla.subfamilia.nombre);
    if (regla.tipo) partes.push(regla.tipo.nombre);
    if (regla.subtipo) partes.push(regla.subtipo.nombre);
    const categoria = partes.length > 0 ? partes.join(' > ') : null;
    const extra = [categoria, regla.marca ? `Marca: ${regla.marca}` : null].filter(Boolean);
    return extra.length > 0 ? extra.join(' — ') : 'Todo el catálogo';
  }

  return (
    <div>
      <h2>Reglas de fidelización</h2>
      <p>
        Descuento automático según el nivel de fidelidad del cliente (Nuevo/Frecuente/VIP),
        opcionalmente acotado a una categoría del catálogo, una marca o una cantidad mínima. Sin
        aplicación automática en la venta todavía.
      </p>

      <button type="button" onClick={iniciarAlta}>
        Nueva regla
      </button>

      {error && <p role="alert">{error}</p>}
      {cargando && <p>Cargando…</p>}

      {editandoId && (
        <div>
          <h3>{editandoId === 'nuevo' ? 'Nueva regla' : 'Editar regla'}</h3>
          <div>
            <label htmlFor="regla-nombre">Nombre</label>
            <input
              id="regla-nombre"
              value={form.nombre}
              onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
            />
          </div>
          <div>
            <label htmlFor="regla-nivel">Nivel requerido</label>
            <select
              id="regla-nivel"
              value={form.nivelRequerido}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  nivelRequerido: e.target.value as NivelFidelidad,
                }))
              }
            >
              {NIVELES.map((nivel) => (
                <option key={nivel} value={nivel}>
                  {NIVEL_LABEL[nivel]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="regla-descuento">% de descuento</label>
            <input
              id="regla-descuento"
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={form.descuentoPorcentaje}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, descuentoPorcentaje: e.target.value }))
              }
            />
          </div>

          <fieldset>
            <legend>
              Alcance por categoría (opcional — sin elegir ninguna, aplica a todo el catálogo)
            </legend>
            <div>
              <label htmlFor="regla-familia">Familia</label>
              <select
                id="regla-familia"
                value={form.familiaId}
                onChange={(e) => cambiarFamilia(e.target.value)}
              >
                <option value="">(todas)</option>
                {familias.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="regla-subfamilia">Subfamilia</label>
              <select
                id="regla-subfamilia"
                value={form.subfamiliaId}
                disabled={!form.familiaId}
                onChange={(e) => cambiarSubfamilia(e.target.value)}
              >
                <option value="">(todas)</option>
                {subfamiliasDisponibles.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="regla-tipo">Tipo</label>
              <select
                id="regla-tipo"
                value={form.tipoId}
                disabled={!form.subfamiliaId}
                onChange={(e) => cambiarTipo(e.target.value)}
              >
                <option value="">(todos)</option>
                {tiposDisponibles.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="regla-subtipo">Subtipo</label>
              <select
                id="regla-subtipo"
                value={form.subtipoId}
                disabled={!form.tipoId}
                onChange={(e) => setForm((prev) => ({ ...prev, subtipoId: e.target.value }))}
              >
                <option value="">(todos)</option>
                {subtiposDisponibles.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </div>
          </fieldset>

          <div>
            <label htmlFor="regla-marca">Marca (opcional)</label>
            <input
              id="regla-marca"
              value={form.marca}
              onChange={(e) => setForm((prev) => ({ ...prev, marca: e.target.value }))}
            />
          </div>
          <div>
            <label htmlFor="regla-cantidad-minima">Cantidad mínima (opcional)</label>
            <input
              id="regla-cantidad-minima"
              type="number"
              min={1}
              step="1"
              value={form.cantidadMinima}
              onChange={(e) => setForm((prev) => ({ ...prev, cantidadMinima: e.target.value }))}
            />
          </div>

          {errorForm && <p role="alert">{errorForm}</p>}
          <button type="button" disabled={guardando} onClick={guardar}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
          <button type="button" onClick={cancelarEdicion}>
            Cancelar
          </button>
        </div>
      )}

      {!cargando && reglas.length === 0 && !error && <p>No hay reglas de fidelización cargadas.</p>}

      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Nivel</th>
            <th>Descuento</th>
            <th>Alcance</th>
            <th>Cant. mínima</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {reglas.map((regla) => (
            <tr key={regla.id}>
              <td>{regla.nombre}</td>
              <td>{NIVEL_LABEL[regla.nivelRequerido]}</td>
              <td>{regla.descuentoPorcentaje}%</td>
              <td>{alcanceTexto(regla)}</td>
              <td>{regla.cantidadMinima ?? '—'}</td>
              <td>{regla.activo ? 'Activa' : 'Inactiva'}</td>
              <td>
                <button type="button" onClick={() => iniciarEdicion(regla)}>
                  Editar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
