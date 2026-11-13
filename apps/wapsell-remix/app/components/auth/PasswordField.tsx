import { useState } from 'react';

export const MIN_PASSWORD_LENGTH = 8;

/** Password input with show/hide, as in the Figma auth screens. */
export function PasswordField({ name, label, autoFocus }: Readonly<{ name: string; label: string; autoFocus?: boolean }>) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="ws-field">
      <span className="ws-field__label">{label}</span>
      <span className="ws-field__control">
        <input
          type={visible ? 'text' : 'password'}
          name={name}
          required
          minLength={MIN_PASSWORD_LENGTH}
          maxLength={72}
          autoComplete="new-password"
          autoFocus={autoFocus}
        />
        <button
          type="button"
          className="ws-field__toggle"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          aria-pressed={visible}
        >
          <img src="/brand/eye.svg" alt="" width={20} height={20} />
        </button>
      </span>
    </label>
  );
}
