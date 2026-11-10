import { Form, useActionData, useNavigation } from '@remix-run/react';
import { Link } from '@remix-run/react';

interface ActionData {
  error?: string;
}

export function LoginForm() {
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <Form method="post" className="auth-form">
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
        {isSubmitting ? 'Ingresando...' : 'Ingresar'}
      </button>

      <p className="auth-footer">
        ¿No tenés cuenta? <Link to="/es/auth/register">Crear una</Link>
      </p>
    </Form>
  );
}
