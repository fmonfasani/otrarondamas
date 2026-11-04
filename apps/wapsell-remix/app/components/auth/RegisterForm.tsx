import { Form, useActionData, useNavigation } from '@remix-run/react';
import { Link } from '@remix-run/react';

interface ActionData {
  error?: string;
}

export function RegisterForm() {
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <Form method="post" className="auth-form">
      <div className="auth-field">
        <label htmlFor="name" className="auth-label">
          Nombre completo
        </label>
        <input
          id="name"
          type="text"
          name="name"
          required
          className="auth-input"
          placeholder="Tu nombre completo"
          minLength={2}
        />
      </div>

      <div className="auth-field">
        <label htmlFor="email" className="auth-label">
          Email
        </label>
        <input
          id="email"
          type="email"
          name="email"
          required
          className="auth-input"
          placeholder="usuario@ejemplo.com"
        />
      </div>

      <div className="auth-field">
        <label htmlFor="password" className="auth-label">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          name="password"
          required
          className="auth-input"
          placeholder="••••••••"
          minLength={6}
        />
      </div>

      <div className="auth-field">
        <label htmlFor="confirmPassword" className="auth-label">
          Confirmar contraseña
        </label>
        <input
          id="confirmPassword"
          type="password"
          name="confirmPassword"
          required
          className="auth-input"
          placeholder="••••••••"
          minLength={6}
        />
      </div>

      {actionData?.error && (
        <div className="form-error" role="alert">
          {actionData.error}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="auth-submit"
      >
        {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
      </button>

      <p className="auth-footer">
        ¿Ya tenés cuenta? <Link to="/es/auth/login">Ingresar</Link>
      </p>
    </Form>
  );
}
