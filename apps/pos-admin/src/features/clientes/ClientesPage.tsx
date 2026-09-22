import { useEffect, useState } from 'react';
import type { Cliente } from '@otrarondamas/shared-types';
import { api, ApiError } from '../../lib/api';

/**
 * Fase 1 del roadmap de Fidelización: CRUD mínimo de Cliente — base
 * bloqueante para las fases siguientes (cliente en el POS, niveles de
 * fidelidad, reglas de descuento). Reemplaza el placeholder
 * "Clientes - En desarrollo" que existía en /customers desde el
 * scaffolding inicial.
 *
 * Sin cuenta corriente (RF-10) ni nivel de fidelidad todavía — eso es
 * otro alcance (Fase 3+ del roadmap). Esto es solo alta/edición de
 * datos básicos.
 *
 * El frontend no oculta el formulario de alta/edición según permiso
 * (mismo criterio que CajaPage/InventarioPage/ComprasPage/PreciosPage)
 * — el backend rechaza con 403 si falta clientes.gestionar.
 */
export function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [search, setSearch] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState({ nombre: '', email: '', telefono: '', direccion: '' });
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => {
      setCargando(true);
      api
        .listarClientes(search || undefined)
        .then((data) => {
          setClientes(data);
          setError(null);
        })
        .catch((err) =>
          setError(err instanceof ApiError ? err.message : 'No se pudo cargar los clientes'),
        )
        .finally(() => setCargando(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [search]);

  function iniciarAlta() {
    setEditandoId('nuevo');
    setForm({ nombre: '', email: '', telefono: '', direccion: '' });
    setErrorForm(null);
  }

  function iniciarEdicion(cliente: Cliente) {
    setEditandoId(cliente.id);
    setForm({
      nombre: cliente.nombre,
      email: cliente.email ?? '',
      telefono: cliente.telefono ?? '',
      direccion: cliente.direccion ?? '',
    });
    setErrorForm(null);
  }

  function cancelarEdicion() {
    setEditandoId(null);
    setErrorForm(null);
  }

  async function guardar() {
    if (!form.nombre.trim()) {
      setErrorForm('El nombre es obligatorio');
      return;
    }
    setGuardando(true);
    setErrorForm(null);
    const dto = {
      nombre: form.nombre.trim(),
      email: form.email.trim() || undefined,
      telefono: form.telefono.trim() || undefined,
      direccion: form.direccion.trim() || undefined,
    };
    try {
      if (editandoId === 'nuevo') {
        const creado = await api.crearCliente(dto);
        setClientes((prev) => [creado, ...prev]);
      } else if (editandoId) {
        const actualizado = await api.actualizarCliente(editandoId, dto);
        setClientes((prev) => prev.map((c) => (c.id === editandoId ? actualizado : c)));
      }
      setEditandoId(null);
    } catch (err) {
      setErrorForm(err instanceof ApiError ? err.message : 'No se pudo guardar el cliente');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div>
      <h2>Clientes</h2>

      <input
        type="search"
        placeholder="Buscar por nombre o email…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <button type="button" onClick={iniciarAlta}>
        Nuevo cliente
      </button>

      {error && <p role="alert">{error}</p>}
      {cargando && <p>Cargando…</p>}

      {editandoId && (
        <div>
          <h3>{editandoId === 'nuevo' ? 'Nuevo cliente' : 'Editar cliente'}</h3>
          <div>
            <label htmlFor="cliente-nombre">Nombre</label>
            <input
              id="cliente-nombre"
              value={form.nombre}
              onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
            />
          </div>
          <div>
            <label htmlFor="cliente-email">Email</label>
            <input
              id="cliente-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            />
          </div>
          <div>
            <label htmlFor="cliente-telefono">Teléfono</label>
            <input
              id="cliente-telefono"
              value={form.telefono}
              onChange={(e) => setForm((prev) => ({ ...prev, telefono: e.target.value }))}
            />
          </div>
          <div>
            <label htmlFor="cliente-direccion">Dirección</label>
            <input
              id="cliente-direccion"
              value={form.direccion}
              onChange={(e) => setForm((prev) => ({ ...prev, direccion: e.target.value }))}
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

      {!cargando && clientes.length === 0 && !error && <p>No hay clientes cargados.</p>}

      <ul>
        {clientes.map((cliente) => (
          <li key={cliente.id}>
            <span>{cliente.nombre}</span>
            {cliente.email && <span> — {cliente.email}</span>}
            {cliente.telefono && <span> — {cliente.telefono}</span>}
            <button type="button" onClick={() => iniciarEdicion(cliente)}>
              Editar
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
