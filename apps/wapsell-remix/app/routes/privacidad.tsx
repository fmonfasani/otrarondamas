import type { MetaFunction } from '@remix-run/node';
import { LegalPage } from '~/components/legal/LegalPage';

export const meta: MetaFunction = () => [
  { title: 'Política de privacidad · Wapsell' },
  {
    name: 'description',
    content: 'Qué datos trata Wapsell, para qué y cómo ejercer tus derechos.',
  },
];

/** Política de privacidad (base; to be reviewed by a lawyer). Required by Google sign-in. */
export default function Privacidad() {
  return (
    <LegalPage title="Política de privacidad" updated="17 de noviembre de 2026">
      <p>
        Wapsell es una plataforma para que comercios vendan, cobren y conversen con sus clientes.
        Esta política explica qué datos personales tratamos, para qué y cómo podés ejercer tus
        derechos, conforme a la Ley 25.326 de Protección de los Datos Personales de la República
        Argentina.
      </p>

      <h2>1. Quién es responsable</h2>
      <p>
        Hay dos roles distintos. <b>Wapsell</b> es responsable de los datos de las cuentas que usan
        la plataforma (dueños y equipos de los comercios). <b>Cada comercio</b> es responsable de
        los datos de sus propios clientes; Wapsell los trata por cuenta del comercio, solo para
        prestarle el servicio. Contacto: <a href="mailto:admin@wapsell.com">admin@wapsell.com</a>.
      </p>

      <h2>2. Qué datos tratamos</h2>
      <ul>
        <li>
          <b>Cuentas del equipo:</b> nombre, email, rol en el negocio, contraseña (guardada cifrada)
          y, si se activa, la verificación en dos pasos.
        </li>
        <li>
          <b>Ingreso con Google:</b> si elegís ingresar con Google, recibimos tu nombre, tu email y
          tu foto de perfil. No accedemos a tus correos, archivos ni contactos de Google.
        </li>
        <li>
          <b>Clientes de cada tienda:</b> nombre, email, teléfono, dirección de entrega, pedidos,
          compras, devoluciones y los mensajes que intercambian con el comercio.
        </li>
        <li>
          <b>Operación del comercio:</b> productos, precios, stock, ventas, caja y el registro de
          auditoría de quién hizo cada cambio.
        </li>
        <li>
          <b>Datos técnicos:</b> registros de acceso y de errores necesarios para la seguridad y el
          funcionamiento.
        </li>
      </ul>

      <h2>3. Para qué los usamos</h2>
      <ul>
        <li>Dar acceso a la plataforma y proteger las cuentas.</li>
        <li>Que cada comercio gestione sus ventas, pedidos, cobros, devoluciones y mensajes.</li>
        <li>
          Enviar emails necesarios del servicio: invitaciones, recuperación de contraseña y avisos
          de pedidos.
        </li>
        <li>Mantener la seguridad, prevenir fraudes y cumplir obligaciones legales.</li>
      </ul>
      <p>No vendemos datos personales ni los usamos para publicidad de terceros.</p>

      <h2>4. Con quién los compartimos</h2>
      <p>Solo con proveedores que necesitamos para prestar el servicio, y para ese fin:</p>
      <ul>
        <li>
          <b>Hetzner</b> (alojamiento de los servidores, Unión Europea).
        </li>
        <li>
          <b>Resend</b> (envío de emails).
        </li>
        <li>
          <b>Mercado Pago</b> (cobros online, cuando el comercio lo conecta; cobra en la cuenta del
          propio comercio).
        </li>
        <li>
          <b>Google</b> (solo si elegís ingresar con Google).
        </li>
      </ul>
      <p>
        Algunos de estos proveedores procesan datos fuera de la Argentina, con medidas de protección
        adecuadas.
      </p>

      <h2>5. Cuánto tiempo los guardamos</h2>
      <p>
        Mientras la cuenta o el comercio estén activos y el tiempo que exijan las obligaciones
        legales. El registro de auditoría se conserva cinco años. Las copias de seguridad se
        renuevan periódicamente.
      </p>

      <h2>6. Seguridad</h2>
      <p>
        Conexiones cifradas (HTTPS), contraseñas guardadas con hash, verificación en dos pasos
        obligatoria para dueños y administradores, secretos cifrados, aislamiento de los datos de
        cada comercio y copias de seguridad.
      </p>

      <h2>7. Tus derechos</h2>
      <p>
        Podés pedir acceso, rectificación, actualización o supresión de tus datos escribiendo a{' '}
        <a href="mailto:admin@wapsell.com">admin@wapsell.com</a>. Si sos cliente de una tienda,
        también podés pedírselo directamente al comercio. Respondemos dentro de los plazos de la Ley
        25.326. La Agencia de Acceso a la Información Pública, órgano de control de la ley, atiende
        las denuncias y reclamos por incumplimiento de las normas de protección de datos personales.
      </p>

      <h2>8. Cambios</h2>
      <p>Si cambiamos esta política, publicamos la versión nueva en esta página con su fecha.</p>
    </LegalPage>
  );
}
