import { CUT_MESSAGE } from '~/utils/connection';

/** «Se cortó la conexión…», after the automatic retry dropped too (never while sending). */
export function CutNotice({ show }: Readonly<{ show: boolean }>) {
  return show ? (
    <p className="ws-alert" role="alert">
      {CUT_MESSAGE}
    </p>
  ) : null;
}
