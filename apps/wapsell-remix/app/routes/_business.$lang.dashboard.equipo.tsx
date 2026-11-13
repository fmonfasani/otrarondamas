import { json, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Form, useActionData, useLoaderData, useNavigation } from '@remix-run/react';
import { useState } from 'react';
import { requireAuth } from '~/services/auth.server';
import { ApiError, apiRequest, settle } from '~/services/api.server';
import { formatDateTime } from '~/utils/format';
import {
  INVITABLE_ROLES,
  ROLE_LABELS,
  STATUS_INFO,
  canChangeStatus,
  dossierInfo,
  invitationState,
  looksLikeEmail,
  missingSentence,
  type Invitation,
  type TeamMember,
} from '~/utils/team';

export const meta: MetaFunction = () => [{ title: 'Equipo · Wapsell' }];

/**
 * Equipo — who works in the Business: invite with a role, see pending invitations,
 * approve dossiers (RF-17) and suspend/reactivate access. Viewing needs USERS_VIEW and
 * managing USERS_MANAGE (Owner and Admin); the API enforces both.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireAuth(request);
  try {
    const team = await apiRequest<TeamMember[]>(token, '/memberships');
    const invitations = await settle(apiRequest<Invitation[]>(token, '/invitaciones'));
    return json({ team, invitations: invitations ?? [], canManage: invitations !== null, denied: false });
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      return json({ team: [] as TeamMember[], invitations: [] as Invitation[], canManage: false, denied: true });
    }
    throw error;
  }
}

type ActionData =
  | { ok: true; intent: 'invite'; message: string; link: string; emailSent: boolean }
  | { ok: boolean; intent: string; message: string };

export async function action({ request }: ActionFunctionArgs) {
  const token = await requireAuth(request);
  const form = await request.formData();
  const intent = String(form.get('intent'));
  const id = (name: string) => encodeURIComponent(String(form.get(name) ?? ''));
  try {
    if (intent === 'invite') {
      const email = String(form.get('email') ?? '').trim().toLowerCase();
      const rol = String(form.get('rol') ?? '');
      if (!looksLikeEmail(email)) return json<ActionData>({ ok: false, intent, message: 'Revisá el email.' }, { status: 400 });
      if (!INVITABLE_ROLES.some((r) => r.value === rol)) {
        return json<ActionData>({ ok: false, intent, message: 'Elegí un rol.' }, { status: 400 });
      }
      const result = await apiRequest<{ linkActivacion: string; emailEnviado: boolean }>(token, '/invitaciones', {
        method: 'POST',
        body: JSON.stringify({ email, rol }),
      });
      return json<ActionData>({
        ok: true,
        intent: 'invite',
        message: result.emailEnviado
          ? `Le mandamos la invitación a ${email}.`
          : `Invitación creada, pero no pudimos mandar el email. Copiá el link y mandáselo a ${email}.`,
        link: result.linkActivacion,
        emailSent: result.emailEnviado,
      });
    }
    if (intent === 'approve') {
      const result = await apiRequest<{ aprobado?: boolean; faltantes?: string[] }>(token, `/legajo/${id('usuarioId')}/aprobar`, {
        method: 'PATCH',
      });
      if (result.aprobado === false) {
        return json<ActionData>({ ok: false, intent, message: missingSentence(result.faltantes ?? []) });
      }
      return json<ActionData>({ ok: true, intent, message: 'Legajo aprobado. Ya puede operar (tiene que volver a ingresar).' });
    }
    if (intent === 'suspend' || intent === 'reactivate') {
      await apiRequest(token, `/memberships/${id('membershipId')}/${intent}`, { method: 'PATCH' });
      return json<ActionData>({ ok: true, intent, message: intent === 'suspend' ? 'Acceso suspendido.' : 'Acceso reactivado.' });
    }
    return json<ActionData>({ ok: false, intent, message: 'Acción desconocida.' }, { status: 400 });
  } catch (error) {
    if (error instanceof ApiError) return json<ActionData>({ ok: false, intent, message: error.message }, { status: error.status });
    throw error;
  }
}

export default function Equipo() {
  const { team, invitations, canManage, denied } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const viewerRole = team.find((m) => m.isViewer)?.role ?? null;

  if (denied) {
    return (
      <div className="ws-page">
        <h1 className="ws-page__title">Equipo</h1>
        <p className="ws-alert" role="alert">Solo el Owner y los administradores ven el equipo.</p>
      </div>
    );
  }
  return (
    <div className="ws-page ws-page--wide">
      <div className="ws-page__head">
        <div className="ws-page__titles">
          <p className="ws-page__eyebrow">PERSONAS</p>
          <h1 className="ws-page__title">Equipo</h1>
          <p className="ws-page__lead">Invitá a quienes trabajan con vos y elegí qué puede hacer cada uno.</p>
        </div>
      </div>
      {result && (
        <div className={result.ok ? 'ws-notice' : 'ws-alert'} role={result.ok ? 'status' : 'alert'}>
          <p>{result.message}</p>
          {'link' in result && !result.emailSent && <CopyLink link={result.link} />}
        </div>
      )}
      <div className="ws-team">
        {canManage && <InviteCard />}
        <TeamTable team={team} canManage={canManage} viewerRole={viewerRole} />
        {canManage && invitations.length > 0 && <InvitationsCard invitations={invitations} />}
      </div>
    </div>
  );
}

function CopyLink({ link }: Readonly<{ link: string }>) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="ws-copy">
      <input readOnly value={link} aria-label="Link de invitación" onFocus={(event) => event.currentTarget.select()} />
      <button
        type="button"
        className="ws-button ws-button--outline ws-button--auto"
        onClick={() => navigator.clipboard?.writeText(link).then(() => setCopied(true))}
      >
        {copied ? 'Copiado' : 'Copiar'}
      </button>
    </div>
  );
}

function InviteCard() {
  const navigation = useNavigation();
  const [rol, setRol] = useState<string>('VENDEDOR');
  const busy = navigation.state !== 'idle' && navigation.formData?.get('intent') === 'invite';
  const help = INVITABLE_ROLES.find((r) => r.value === rol)?.help;
  return (
    <section className="ws-card" aria-labelledby="invite-title">
      <h2 id="invite-title" className="ws-card__title">Invitar a alguien</h2>
      <Form method="post" className="ws-team__invite">
        <input type="hidden" name="intent" value="invite" />
        <label className="ws-field">
          <span className="ws-field__label">Email</span>
          <span className="ws-field__control">
            <input name="email" type="email" required placeholder="nombre@ejemplo.com" autoComplete="off" />
          </span>
        </label>
        <label className="ws-field">
          <span className="ws-field__label">Rol</span>
          <span className="ws-field__control">
            <select name="rol" value={rol} onChange={(event) => setRol(event.target.value)}>
              {INVITABLE_ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </span>
          <small className="ws-meta">{help}</small>
        </label>
        <button className="ws-button ws-button--primary ws-button--auto" type="submit" disabled={busy}>
          {busy ? 'Invitando…' : 'Mandar invitación'}
        </button>
      </Form>
      <p className="ws-meta">La invitación vence en 7 días. Antes de operar, la persona completa su legajo y vos lo aprobás.</p>
    </section>
  );
}

function TeamTable({ team, canManage, viewerRole }: Readonly<{ team: TeamMember[]; canManage: boolean; viewerRole: string | null }>) {
  const navigation = useNavigation();
  const busy = navigation.state !== 'idle';
  return (
    <section className="ws-card" aria-labelledby="team-title">
      <h2 id="team-title" className="ws-card__title">{team.length} {team.length === 1 ? 'persona' : 'personas'}</h2>
      <table className="ws-table ws-table--team">
        <thead>
          <tr>
            <th>Persona</th>
            <th>Rol</th>
            <th>Estado</th>
            {canManage && <th aria-label="Acciones" />}
          </tr>
        </thead>
        <tbody>
          {team.map((member) => {
            const status = STATUS_INFO[member.status] ?? { label: member.status, tone: 'muted' };
            const dossier = dossierInfo(member.estadoLegajo);
            return (
              <tr key={member.membershipId}>
                <td>
                  <b>{member.isViewer ? `${member.nombre} (vos)` : member.nombre}</b>
                  <small className="ws-team__email">{member.email}</small>
                </td>
                <td>{ROLE_LABELS[member.role] ?? member.role}</td>
                <td>
                  <span className="ws-team__chips">
                    <span className={`ws-chip ws-chip--${status.tone}`}>{status.label}</span>
                    {member.role !== 'OWNER' && <span className={`ws-chip ws-chip--${dossier.tone}`}>{dossier.label}</span>}
                  </span>
                </td>
                {canManage && (
                  <td className="ws-team__actions">
                    {member.estadoLegajo === 'PENDIENTE' && member.usuarioId && (
                      <Form method="post">
                        <input type="hidden" name="intent" value="approve" />
                        <input type="hidden" name="usuarioId" value={member.usuarioId} />
                        <button className="ws-button ws-button--outline ws-button--auto" type="submit" disabled={busy}>Aprobar legajo</button>
                      </Form>
                    )}
                    {canChangeStatus(member, viewerRole) && (
                      <Form
                        method="post"
                        onSubmit={(event) => {
                          if (member.status === 'ACTIVE' && !window.confirm(`¿Suspender a ${member.nombre}? No va a poder ingresar hasta que lo reactives.`)) {
                            event.preventDefault();
                          }
                        }}
                      >
                        <input type="hidden" name="intent" value={member.status === 'ACTIVE' ? 'suspend' : 'reactivate'} />
                        <input type="hidden" name="membershipId" value={member.membershipId} />
                        <button className="ws-button ws-button--outline ws-button--auto" type="submit" disabled={busy}>
                          {member.status === 'ACTIVE' ? 'Suspender' : 'Reactivar'}
                        </button>
                      </Form>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function InvitationsCard({ invitations }: Readonly<{ invitations: Invitation[] }>) {
  return (
    <section className="ws-card" aria-labelledby="invitations-title">
      <h2 id="invitations-title" className="ws-card__title">Invitaciones</h2>
      <ul className="ws-payments">
        {invitations.map((invitation) => {
          const state = invitationState(invitation);
          return (
            <li key={invitation.id}>
              <span>
                <b>{invitation.email}</b>
                <small>
                  {ROLE_LABELS[invitation.rol] ?? invitation.rol} · enviada {formatDateTime(invitation.createdAt)}
                </small>
              </span>
              <span className={`ws-chip ws-chip--${state.tone}`}>{state.label}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
