import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

/** A button that copies a link; says «Copiado» for a moment (or selects nothing if refused). */
export function CopyLink({ value, label = 'Copiar link' }: Readonly<{ value: string; label?: string }>) {
  const [done, setDone] = useState<'ok' | 'no' | null>(null);
  return (
    <button
      type="button"
      className="ws-button ws-button--outline ws-button--auto"
      onClick={() => {
        navigator.clipboard
          ?.writeText(value)
          .then(() => setDone('ok'))
          .catch(() => setDone('no'))
          .finally(() => window.setTimeout(() => setDone(null), 2000));
      }}
    >
      {done === 'ok' ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
      {done === 'ok' ? 'Copiado' : done === 'no' ? 'Copialo a mano' : label}
    </button>
  );
}
