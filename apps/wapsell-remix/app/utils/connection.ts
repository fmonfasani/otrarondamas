import { useEffect, useRef } from 'react';
import { useSubmit } from '@remix-run/react';

/**
 * When the connection drops while a form is being sent (seen on 2026-11-27: the sign-in and the
 * code of the two-step verification, sent after the page sat still for over a minute, arrived
 * cut and the browser showed «Application Error»).
 *
 * The route's clientAction wraps the server call with `guardConnection`: a dropped connection
 * (the browser's TypeError «Failed to fetch») becomes `{ connectionCut: true }` instead of an
 * error page. The screen's `useRetryOnCut` sends the same form once more on its own (the first
 * one never reached Wapsell, so nothing is done twice) and, if that drops too, says so and keeps
 * what was typed.
 */
export type ConnectionCut = { connectionCut: true };

export const CUT_MESSAGE = 'Se cortó la conexión con Wapsell. Volvé a tocar el botón: lo que escribiste sigue acá.';

export const isCut = (value: unknown): value is ConnectionCut =>
  typeof value === 'object' && value !== null && (value as { connectionCut?: unknown }).connectionCut === true;

export async function guardConnection<T>(serverAction: () => Promise<T>): Promise<T | ConnectionCut> {
  try {
    return await serverAction();
  } catch (error) {
    // fetch() rejects with a TypeError only when no answer came back at all.
    if (error instanceof TypeError) return { connectionCut: true };
    throw error;
  }
}

/** Resend the form once on a dropped connection; `cut` is true only after the retry dropped too. */
export function useRetryOnCut(result: unknown) {
  const form = useRef<HTMLFormElement>(null);
  const submit = useSubmit();
  const retried = useRef(false);
  const dropped = isCut(result);
  useEffect(() => {
    if (dropped && !retried.current && form.current) {
      retried.current = true;
      submit(form.current);
    }
  }, [result]);
  return {
    form,
    /** A tap of the person (not the automatic retry) earns a new automatic retry. */
    onSubmit: () => {
      retried.current = false;
    },
    cut: dropped && retried.current,
  };
}
