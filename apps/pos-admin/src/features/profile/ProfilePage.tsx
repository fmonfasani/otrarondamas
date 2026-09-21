import {
  Mail,
  Building2,
  ShieldCheck,
  Calendar,
  Chrome,
  Lock,
  User as UserIcon,
} from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../components';
import { useAuth } from '../auth/AuthContext';

/**
 * Solo lectura por ahora (decisión explícita, no una limitación técnica):
 * el dueño pidió mostrar el perfil, no editarlo — no hay endpoint
 * PATCH /usuarios/me todavía. Todos los campos vienen de PerfilUsuario
 * (ver apps/api/src/auth/auth.types.ts), poblado en useAuth().user por
 * GET /auth/me o directamente en la respuesta de /auth/login.
 *
 * "Todos los datos posibles" de Google (pedido original) tiene un techo
 * real: el scope OAuth "profile email" solo expone id/email/nombre/foto.
 * No hay teléfono, dirección ni fecha de nacimiento sin scopes
 * adicionales sujetos a verificación manual de Google — no se muestran
 * campos que no existen.
 */
export function ProfilePage() {
  const { user } = useAuth();

  // ProtectedRoute ya garantiza que hay sesión antes de montar esta
  // página — este null es defensivo, no un estado real esperado.
  if (!user) return null;

  const fechaAlta = new Date(user.createdAt).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-6">
      <h1 className="text-h1 font-bold">Mi Perfil</h1>

      <Card>
        <CardBody className="flex items-center gap-6">
          {user.fotoUrl ? (
            <img
              src={user.fotoUrl}
              alt={user.nombre}
              className="w-20 h-20 rounded-full object-cover border-2 border-brand-yellow"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center border-2 border-brand-yellow">
              <UserIcon className="w-10 h-10 text-gray-500" />
            </div>
          )}
          <div>
            <p className="text-h2 font-bold">{user.nombre}</p>
            <p className="text-gray-600">{user.email}</p>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-h3 font-bold">Información de la cuenta</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex items-center gap-4">
            <Mail className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-small text-gray-500">Email</p>
              <p className="font-semibold">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Building2 className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-small text-gray-500">Empresa</p>
              <p className="font-semibold">{user.empresaNombre}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user.metodoLogin === 'google' ? (
              <Chrome className="w-5 h-5 text-gray-400 flex-shrink-0" />
            ) : (
              <Lock className="w-5 h-5 text-gray-400 flex-shrink-0" />
            )}
            <div>
              <p className="text-small text-gray-500">Método de ingreso</p>
              <p className="font-semibold">
                {user.metodoLogin === 'google' ? 'Google' : 'Email y contraseña'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Calendar className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-small text-gray-500">Cuenta creada</p>
              <p className="font-semibold">{fechaAlta}</p>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-h3 font-bold">Permisos</h2>
        </CardHeader>
        <CardBody>
          {user.permisos.length === 0 ? (
            <p className="text-gray-500">
              Todavía no tenés ningún permiso asignado. Pedile a un administrador que te los asigne
              para poder operar el sistema.
            </p>
          ) : (
            <ul className="space-y-2">
              {user.permisos.map((permiso) => (
                <li key={permiso} className="flex items-center gap-3">
                  <ShieldCheck className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="font-mono text-sm">{permiso}</span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
