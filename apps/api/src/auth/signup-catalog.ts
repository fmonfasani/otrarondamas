/**
 * ADR-IDN-008/009 — what «Vendé en Wapsell» asks about the business: its type (rubro →
 * subrubro, a short list of Wapsell's own), its province and, optionally, its CUIT.
 * Kept here as the single source: the web form reads it from GET /auth/registro/catalogo.
 */
export const RUBROS: Record<string, string[]> = {
  'Almacén y despensa': ['Almacén', 'Autoservicio', 'Dietética', 'Fiambrería', 'Kiosco', 'Otro'],
  Bebidas: ['Vinoteca', 'Distribuidora', 'Cervecería', 'Bebidas sin alcohol', 'Otro'],
  Gastronomía: ['Bar', 'Restaurante', 'Cafetería', 'Rotisería', 'Delivery', 'Otro'],
  'Panadería y pastelería': ['Panadería', 'Pastelería', 'Confitería', 'Otro'],
  'Carnes y frescos': ['Carnicería', 'Pollería', 'Pescadería', 'Verdulería', 'Otro'],
  'Moda y accesorios': ['Indumentaria', 'Calzado', 'Accesorios', 'Lencería', 'Otro'],
  'Belleza y cuidado personal': ['Perfumería', 'Cosmética', 'Peluquería', 'Estética', 'Otro'],
  'Hogar y decoración': ['Bazar', 'Decoración', 'Muebles', 'Blanquería', 'Otro'],
  'Ferretería y construcción': ['Ferretería', 'Materiales', 'Pinturería', 'Electricidad', 'Otro'],
  'Tecnología y electrónica': [
    'Celulares',
    'Computación',
    'Electrodomésticos',
    'Accesorios',
    'Otro',
  ],
  'Salud y farmacia': ['Farmacia', 'Óptica', 'Ortopedia', 'Otro'],
  Mascotas: ['Pet shop', 'Veterinaria', 'Alimento balanceado', 'Otro'],
  'Librería y regalos': ['Librería', 'Juguetería', 'Regalería', 'Otro'],
  'Deportes y aire libre': ['Deportes', 'Bicicletería', 'Camping', 'Otro'],
  'Servicios y otros': ['Servicios profesionales', 'Mayorista', 'Otro'],
};

export const PROVINCIAS = [
  'Buenos Aires',
  'Ciudad Autónoma de Buenos Aires',
  'Catamarca',
  'Chaco',
  'Chubut',
  'Córdoba',
  'Corrientes',
  'Entre Ríos',
  'Formosa',
  'Jujuy',
  'La Pampa',
  'La Rioja',
  'Mendoza',
  'Misiones',
  'Neuquén',
  'Río Negro',
  'Salta',
  'San Juan',
  'San Luis',
  'Santa Cruz',
  'Santa Fe',
  'Santiago del Estero',
  'Tierra del Fuego',
  'Tucumán',
];

/** CUIT/CUIL check digit (mod 11). Accepts «30-71234567-8» or «30712345678»; returns digits or null. */
export function normalizeCuit(raw: string): string | null {
  const digits = raw.replaceAll(/\D/g, '');
  if (digits.length !== 11) return null;
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const sum = weights.reduce((acc, w, i) => acc + w * Number(digits[i]), 0);
  const rest = 11 - (sum % 11);
  const check = rest === 11 ? 0 : rest === 10 ? 9 : rest;
  return check === Number(digits[10]) ? digits : null;
}

/** The business profile asked at sign-up, as stored in Empresa.configuracion.perfil. */
export type BusinessProfile = {
  cuit: string | null;
  /** INICIAL until the CUIT is verified against ARCA (ADR-IDN-004/006); a typed CUIT is not proof. */
  nivel: 'INICIAL';
  direccion: string;
  ciudad: string;
  provincia: string;
  codigoPostal: string;
  rubro: string;
  subrubro: string;
};
