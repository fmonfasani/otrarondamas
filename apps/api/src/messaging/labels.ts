/** E6a — the colours a customer label can have (the panel draws each one). */
export const LABEL_COLORS = [
  'gris',
  'rojo',
  'naranja',
  'amarillo',
  'verde',
  'celeste',
  'azul',
  'violeta',
] as const;

export type LabelColor = (typeof LABEL_COLORS)[number];
