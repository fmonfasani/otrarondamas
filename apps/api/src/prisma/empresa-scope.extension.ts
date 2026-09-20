import { Prisma } from '@prisma/client';

/**
 * Aislamiento multiempresa (INV-01, sección 5 del SDD) implementado como
 * Prisma Client Extension — no como un middleware "que confía" en que
 * cada service se acuerde de filtrar por empresaId a mano. El SDD exige
 * explícitamente que el aislamiento se proteja "desde la lógica del
 * servidor y la base de datos, no únicamente desde la interfaz".
 *
 * Mecanismo elegido (documentado también en docs/scaffolding-notas.md):
 * Prisma Client Extension en vez de Row-Level Security de PostgreSQL.
 * Motivo: RLS requeriría ejecutar `SET app.current_empresa_id` en cada
 * conexión del pool antes de cada query, lo cual con el pool interno de
 * Prisma (que reutiliza conexiones entre requests) es frágil de
 * garantizar sin controlar manualmente la asignación de conexiones. La
 * Client Extension logra el mismo resultado — imposible ejecutar una
 * query de un modelo con empresaId sin ese filtro — sin depender de
 * estado de sesión de la conexión física.
 *
 * SOLO cubre los 17 modelos que tienen la columna `empresaId` de forma
 * directa (ver la lista MODELOS_CON_EMPRESA_ID abajo). Modelos que
 * heredan el scope a través de una relación (VentaItem -> Venta,
 * AplicacionPago -> Pago, AperturaCaja/MovimientoCaja/ArqueoCaja/
 * CierreCaja -> Caja, CompraItem -> Compra) NO están cubiertos por este
 * extension todavía — el aislamiento de esos modelos depende de que el
 * código que los consulta siempre pase por su padre con empresaId ya
 * filtrado. Esto es una limitación real, no un TODO decorativo: falta
 * decidir si se cubre con un extension aparte que haga join implícito, o
 * si alcanza con la disciplina de siempre consultarlos anidados desde su
 * padre.
 */
const MODELOS_CON_EMPRESA_ID = [
  'Usuario',
  'Categoria',
  'Producto',
  'Presentacion',
  'Lote',
  'Cliente',
  'CuentaCorriente',
  'Deuda',
  'Venta',
  'Pedido',
  'Pago',
  'Caja',
  'Proveedor',
  'Compra',
  'RecepcionCompra',
  'MovimientoStock',
  'Entrega',
  'Notificacion',
  'AuditLog',
  'Autorizacion',
] as const;

type ModeloConEmpresaId = (typeof MODELOS_CON_EMPRESA_ID)[number];

function esModeloConEmpresaId(model: string | undefined): model is ModeloConEmpresaId {
  return !!model && (MODELOS_CON_EMPRESA_ID as readonly string[]).includes(model);
}

// Operaciones cuyo `where` de nivel superior admite agregarle empresaId
// directamente sin romper el contrato de tipos de Prisma. findUnique* NO
// entra acá: su `where` solo acepta campos únicos individuales o un
// compound unique explícito, y ninguno de los modelos de este schema
// define `@@unique([id, empresaId])` — agregar empresaId ahí rompería
// la query en vez de filtrarla. Ver manejo aparte más abajo.
const OPERACIONES_CON_WHERE = new Set([
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'update',
  'updateMany',
  'delete',
  'deleteMany',
  'count',
  'aggregate',
]);

const OPERACIONES_FIND_UNIQUE = new Set(['findUnique', 'findUniqueOrThrow']);

/**
 * Crea un extension de Prisma atado a una empresa concreta. Se instancia
 * por request (ver EmpresaScopedPrismaFactory), nunca como singleton
 * global, porque el empresaId depende del usuario autenticado de cada
 * request.
 */
export function empresaScopeExtension(empresaId: string) {
  return Prisma.defineExtension((client) =>
    client.$extends({
      name: 'empresa-scope',
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            if (!esModeloConEmpresaId(model)) {
              return query(args);
            }

            const a = args as {
              where?: Record<string, unknown>;
              data?: Record<string, unknown> | Array<Record<string, unknown>>;
            };

            if (operation === 'create') {
              // No confiar en un empresaId que venga del body del request:
              // siempre se fuerza al de la sesión autenticada.
              a.data = { ...(a.data as Record<string, unknown>), empresaId };
              return query(a);
            }

            if (operation === 'createMany') {
              const rows = Array.isArray(a.data) ? a.data : a.data ? [a.data] : [];
              a.data = rows.map((row) => ({ ...row, empresaId }));
              return query(a);
            }

            if (OPERACIONES_CON_WHERE.has(operation)) {
              a.where = { ...(a.where ?? {}), empresaId };
              return query(a);
            }

            if (OPERACIONES_FIND_UNIQUE.has(operation)) {
              // No se puede inyectar empresaId en el `where` de
              // findUnique sin un compound unique que lo respalde (ver
              // comentario arriba), así que se verifica DESPUÉS de
              // ejecutar la query: si el registro existe pero es de otra
              // empresa, se trata como "no encontrado" — nunca se
              // devuelve el dato de otra empresa.
              const resultado = await query(a);
              if (
                resultado &&
                typeof resultado === 'object' &&
                'empresaId' in resultado &&
                (resultado as { empresaId: unknown }).empresaId !== empresaId
              ) {
                if (operation === 'findUniqueOrThrow') {
                  throw new Prisma.PrismaClientKnownRequestError(`No ${model} found`, {
                    code: 'P2025',
                    clientVersion: Prisma.prismaVersion.client,
                  });
                }
                return null;
              }
              return resultado;
            }

            // upsert y cualquier operación no contemplada explícitamente:
            // se rechaza en vez de dejarla pasar sin scope, para no
            // asumir silenciosamente que es segura.
            throw new Error(
              `empresaScopeExtension: operación '${operation}' sobre '${model}' no tiene manejo de aislamiento por empresa definido. Agregala explícitamente antes de usarla.`,
            );
          },
        },
      },
    }),
  );
}
