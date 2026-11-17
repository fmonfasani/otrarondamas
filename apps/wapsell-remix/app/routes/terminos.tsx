import type { MetaFunction } from '@remix-run/node';
import { LegalPage } from '~/components/legal/LegalPage';

export const meta: MetaFunction = () => [
  { title: 'Términos y condiciones · Wapsell' },
  { name: 'description', content: 'Condiciones de uso de la plataforma Wapsell.' },
];

/** Términos y condiciones (base; to be reviewed by a lawyer). Required by Google sign-in. */
export default function Terminos() {
  return (
    <LegalPage title="Términos y condiciones" updated="17 de noviembre de 2026">
      <p>
        Estos términos rigen el uso de Wapsell (app.wapsell.com y las tiendas de cada comercio). Al
        usar la plataforma aceptás estas condiciones.
      </p>

      <h2>1. El servicio</h2>
      <p>
        Wapsell ofrece a los comercios herramientas para vender en el mostrador y en una tienda
        online, cobrar, gestionar pedidos, stock, caja, devoluciones y conversar con sus clientes.
        Cada comercio opera su propio negocio y es responsable de lo que vende, de sus precios, de
        sus entregas y de la atención a sus clientes.
      </p>

      <h2>2. Cuentas</h2>
      <ul>
        <li>Las cuentas del equipo de un comercio se crean por invitación de su dueño.</li>
        <li>
          Sos responsable de cuidar tu contraseña y tus códigos de verificación. Los dueños y
          administradores deben usar la verificación en dos pasos.
        </li>
        <li>
          Avisanos a <a href="mailto:admin@wapsell.com">admin@wapsell.com</a> si creés que alguien
          usó tu cuenta.
        </li>
      </ul>

      <h2>3. Uso aceptable</h2>
      <p>
        No está permitido usar Wapsell para actividades ilegales, vender productos prohibidos,
        enviar spam, intentar acceder a datos de otros comercios ni afectar el funcionamiento de la
        plataforma.
      </p>

      <h2>4. Compras en las tiendas</h2>
      <p>
        Cuando comprás en la tienda de un comercio, el contrato de compra es entre vos y ese
        comercio. El comercio confirma el pedido, cobra (por su propia cuenta de Mercado Pago u
        otros medios), entrega y gestiona las devoluciones según sus políticas y la ley de defensa
        del consumidor.
      </p>

      <h2>5. Datos</h2>
      <p>
        El tratamiento de datos personales se rige por nuestra{' '}
        <a href="/privacidad">Política de privacidad</a>. Cada comercio conserva la titularidad de
        los datos de su negocio y de sus clientes.
      </p>

      <h2>6. Disponibilidad</h2>
      <p>
        Trabajamos para que Wapsell esté disponible y protegido, con copias de seguridad, pero no
        podemos garantizar un servicio sin interrupciones. Podemos hacer mantenimiento o cambios
        para mejorar la plataforma.
      </p>

      <h2>7. Responsabilidad</h2>
      <p>
        En la medida que permita la ley, Wapsell no responde por las operaciones entre los comercios
        y sus clientes, ni por daños indirectos derivados del uso de la plataforma.
      </p>

      <h2>8. Suspensión</h2>
      <p>
        Podemos suspender una cuenta que incumpla estos términos o ponga en riesgo la seguridad de
        otros.
      </p>

      <h2>9. Ley aplicable</h2>
      <p>Estos términos se rigen por las leyes de la República Argentina.</p>

      <h2>10. Contacto y cambios</h2>
      <p>
        Consultas: <a href="mailto:admin@wapsell.com">admin@wapsell.com</a>. Si cambiamos estos
        términos, publicamos la versión nueva en esta página con su fecha.
      </p>
    </LegalPage>
  );
}
