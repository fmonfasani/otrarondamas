import logoSrc from '../assets/logo.jpg';

/**
 * Logo real de marca (círculo negro, borde amarillo, copa de vino —
 * ver Design System "Otra Ronda Más"). El header lo muestra chico
 * junto al wordmark de texto, así el logo real se ve reconocible
 * incluso a 34px sin perder la ilustración.
 */
export function Logo({ size = 34 }: { size?: number }) {
  return (
    <img
      src={logoSrc}
      alt="Otra Ronda Más"
      width={size}
      height={size}
      style={{ borderRadius: '50%', display: 'block', flexShrink: 0 }}
    />
  );
}
