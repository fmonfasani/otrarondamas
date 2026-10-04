import { Prisma } from '@prisma/client';

 /**
 * Relation isolation (B3 / T01-03): una relación persistida no puede
 * vincular recursos de empresas distintas.
 *
 * Prisma no ejecuta los hooks de `query` para operaciones anidadas por
 * separado, pero el hook de la operación de nivel superior sí recibe el
 * payload completo. Este módulo recorre ese payload y extrae las
 * referencias a recursos relacionados cuyo ownership debe verificarse
 * antes de persistir. La verificación contra la base la hace
 * empresa-scope.extension.ts.
 *
 * Registro declarativo y opt-in: solo las relaciones listadas acá se
 * validan. Agregar una relación es agregar una entrada; no cambia el
 * comportamiento del resto del sistema.
 *
 * Clave: modelo dueño de la relación. Valor: nombres de campo-relación
 * (el FK se deriva del schema vía DMMF).
 */
export const RELACIONES_CON_OWNERSHIP: Readonly<Record<string, readonly string[]>> = {
  VentaItem: ['producto', 'reglaFidelizacion'],
  PedidoItem: ['producto', 'reglaFidelizacion'],
};

type Datos = Record<string, unknown>;

export interface ReferenciaRelacional {
  modelo: string;
  where: Datos;
}

const camposPorModelo = new Map<string, Map<string, Prisma.DMMF.Field>>();

function camposDe(modelo: string): Map<string, Prisma.DMMF.Field> {
  let campos = camposPorModelo.get(modelo);
  if (!campos) {
    const definicion = Prisma.dmmf.datamodel.models.find((m) => m.name === modelo);
    campos = new Map((definicion?.fields ?? []).map((f) => [f.name, f]));
    camposPorModelo.set(modelo, campos);
  }
  return campos;
}

function esObjeto(valor: unknown): valor is Datos {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function lista(valor: unknown): unknown[] {
  if (Array.isArray(valor)) return valor;
  return valor === undefined || valor === null ? [] : [valor];
}

function relacionesRegistradas(modelo: string): Map<string, Prisma.DMMF.Field> {
  const resultado = new Map<string, Prisma.DMMF.Field>();
  for (const nombre of RELACIONES_CON_OWNERSHIP[modelo] ?? []) {
    const campo = camposDe(modelo).get(nombre);
    if (
      !campo ||
      campo.kind !== 'object' ||
      campo.relationFromFields?.length !== 1 ||
      campo.relationToFields?.length !== 1
    ) {
      throw new Error(
        `relation-ownership: '${modelo}.${nombre}' no es una relación con FK simple; no se puede verificar su ownership.`,
      );
    }
    resultado.set(nombre, campo);
  }
  return resultado;
}

export function modeloTieneRelacionesConOwnership(modelo: string): boolean {
  return (RELACIONES_CON_OWNERSHIP[modelo] ?? []).length > 0;
}

function valorFk(modelo: string, fk: string, valor: unknown): string | null {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === 'string') return valor;
  if (esObjeto(valor) && Object.keys(valor).length === 1 && 'set' in valor) {
    return valorFk(modelo, fk, valor.set);
  }
  throw new Error(
    `relation-ownership: forma de valor no soportada para '${modelo}.${fk}'; no se puede verificar su ownership.`,
  );
}

function referenciaDeFk(campo: Prisma.DMMF.Field, valor: string): ReferenciaRelacional {
  return { modelo: campo.type, where: { [campo.relationToFields![0]]: valor } };
}

function referenciasDeConnect(
  modelo: string,
  campo: Prisma.DMMF.Field,
  operaciones: unknown,
  refs: ReferenciaRelacional[],
): void {
  if (!esObjeto(operaciones)) return;
  for (const [operacion, payload] of Object.entries(operaciones)) {
    if (operacion !== 'connect') {
      throw new Error(
        `relation-ownership: la operación anidada '${operacion}' sobre '${modelo}.${campo.name}' no tiene manejo de ownership definido. Solo se admite 'connect' o el FK escalar.`,
      );
    }
    for (const where of lista(payload)) {
      if (esObjeto(where)) refs.push({ modelo: campo.type, where });
    }
  }
}

function datosDeUpdate(hijo: string, item: unknown): unknown {
  if (esObjeto(item) && esObjeto(item.data) && !camposDe(hijo).has('data')) return item.data;
  return item;
}

function visitarRelacionNoRegistrada(
  campo: Prisma.DMMF.Field,
  operaciones: unknown,
  refs: ReferenciaRelacional[],
): void {
  if (!esObjeto(operaciones)) return;
  const hijo = campo.type;
  for (const [operacion, payload] of Object.entries(operaciones)) {
    switch (operacion) {
      case 'create':
        lista(payload).forEach((d) => visitarDatos(hijo, d, refs));
        break;
      case 'createMany':
        if (esObjeto(payload)) lista(payload.data).forEach((d) => visitarDatos(hijo, d, refs));
        break;
      case 'connectOrCreate':
        lista(payload).forEach((i) => esObjeto(i) && visitarDatos(hijo, i.create, refs));
        break;
      case 'update':
        lista(payload).forEach((i) => visitarDatos(hijo, datosDeUpdate(hijo, i), refs));
        break;
      case 'updateMany':
        lista(payload).forEach((i) => esObjeto(i) && visitarDatos(hijo, i.data, refs));
        break;
      case 'upsert':
        lista(payload).forEach((i) => {
          if (!esObjeto(i)) return;
          visitarDatos(hijo, i.create, refs);
          visitarDatos(hijo, i.update, refs);
        });
        break;
      default:
        break;
    }
  }
}

function visitarDatos(modelo: string, datos: unknown, refs: ReferenciaRelacional[]): void {
  if (!esObjeto(datos)) return;
  const campos = camposDe(modelo);
  const registradas = relacionesRegistradas(modelo);
  const relacionPorFk = new Map<string, Prisma.DMMF.Field>();
  for (const campo of registradas.values()) {
    relacionPorFk.set(campo.relationFromFields![0], campo);
  }

  for (const [clave, valor] of Object.entries(datos)) {
    if (valor === undefined) continue;
    const campo = campos.get(clave);
    if (!campo) continue;

    const relacionDelFk = relacionPorFk.get(clave);
    if (relacionDelFk) {
      const id = valorFk(modelo, clave, valor);
      if (id !== null) refs.push(referenciaDeFk(relacionDelFk, id));
      continue;
    }

    if (campo.kind !== 'object') continue;

    const registrada = registradas.get(clave);
    if (registrada) {
      referenciasDeConnect(modelo, registrada, valor, refs);
    } else {
      visitarRelacionNoRegistrada(campo, valor, refs);
    }
  }
}

/**
 * Devuelve las referencias a recursos relacionados que la operación
 * (incluyendo sus escrituras anidadas) pretende vincular y que están
 * registradas en RELACIONES_CON_OWNERSHIP. Lanza si una relación
 * registrada se usa de una forma cuyo ownership no se puede verificar.
 */
export function recolectarReferenciasRelacionales(
  modelo: string,
  operacion: string,
  args: unknown,
): ReferenciaRelacional[] {
  if (!esObjeto(args)) return [];
  const refs: ReferenciaRelacional[] = [];

  switch (operacion) {
    case 'create':
    case 'update':
    case 'updateMany':
      visitarDatos(modelo, args.data, refs);
      break;
    case 'createMany':
    case 'createManyAndReturn':
      lista(args.data).forEach((d) => visitarDatos(modelo, d, refs));
      break;
    case 'upsert':
      visitarDatos(modelo, args.create, refs);
      visitarDatos(modelo, args.update, refs);
      break;
    default:
      break;
  }

  const vistas = new Set<string>();
  return refs.filter((ref) => {
    const clave = `${ref.modelo}:${JSON.stringify(ref.where)}`;
    if (vistas.has(clave)) return false;
    vistas.add(clave);
    return true;
  });
}
