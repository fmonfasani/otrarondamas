import { json, type ActionFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Form, Link, useActionData, useNavigation, useParams } from '@remix-run/react';
import { useState } from 'react';
import { requireAuth } from '~/services/auth.server';
import { ApiError, apiRequest } from '~/services/api.server';
import { PlatformShell } from '~/components/platform/PlatformShell';
import { newBusinessFrom, slugFrom } from '~/utils/platform';

export const meta: MetaFunction = () => [{ title: 'Nuevo negocio · Plataforma · Wapsell' }];

type Created = {
  id: string;
  nombre: string;
  slug: string;
  owner: { nombre: string; email: string };
  enlace: string;
  mailEnviado: boolean;
  venceEl: string;
};

/**
 * OR-B4-039 — create a Business with its Owner from the platform. The Owner gets a welcome
 * email with a single-use link (7 days) to create their password; the link is also shown
 * here, once, to pass on if the email does not arrive.
 */
export async function action({ request }: ActionFunctionArgs) {
  const token = await requireAuth(request);
  const parsed = newBusinessFrom(await request.formData());
  if (!parsed.ok) return json({ ok: false as const, message: parsed.message }, { status: 400 });
  try {
    const created = await apiRequest<Created>(token, '/platform-admin/businesses', {
      method: 'POST',
      body: JSON.stringify(parsed.data),
    });
    return json({ ok: true as const, created });
  } catch (error) {
    if (error instanceof ApiError) {
      const message = error.status === 403 ? 'Esta sección es solo para el equipo administrador de Wapsell.' : error.message;
      return json({ ok: false as const, message }, { status: error.status });
    }
    throw error;
  }
}

const field = 'w-full rounded-xl border border-[#e2ded6] bg-white px-4 py-2.5 text-sm';

export default function NewBusiness() {
  const result = useActionData<typeof action>();
  const busy = useNavigation().state !== 'idle';
  const { lang = 'es' } = useParams();
  const [nombre, setNombre] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [copied, setCopied] = useState(false);

  if (result?.ok) {
    const c = result.created;
    return (
      <PlatformShell title="Negocio creado" subtitle={c.nombre}>
        <section className="max-w-2xl space-y-4 rounded-2xl border border-[#e8e4dc] bg-white p-6 shadow-sm">
          <p className="text-sm">
            Creamos <b>{c.nombre}</b> (tienda <code>/tienda/{c.slug}</code>) con <b>{c.owner.nombre}</b> como Owner.
          </p>
          <p className="text-sm">
            {c.mailEnviado
              ? `Le mandamos un mail a ${c.owner.email} para que cree su contraseña.`
              : `El mail a ${c.owner.email} no salió. Pasale este enlace para que cree su contraseña:`}
          </p>
          <div className="rounded-xl bg-[#f7f6f2] p-4">
            <p className="text-xs text-[#77736d]">
              Enlace para crear la contraseña · sirve una vez · vence el {new Date(c.venceEl).toLocaleDateString('es-AR')}
            </p>
            <p className="mt-2 break-all font-mono text-xs">{c.enlace}</p>
            <button
              type="button"
              className="mt-3 rounded-full border border-[#e2ded6] bg-white px-4 py-2 text-xs font-medium"
              onClick={() => {
                void navigator.clipboard?.writeText(c.enlace).then(() => setCopied(true));
              }}
            >
              {copied ? 'Copiado' : 'Copiar enlace'}
            </button>
          </div>
          <p className="text-xs text-[#96918a]">Este enlace se muestra solo ahora. Si se pierde, el Owner puede usar «Olvidé mi contraseña».</p>
          <div className="flex gap-3 text-sm">
            <Link to={`/${lang}/platform-admin/negocios/${c.id}`} className="font-medium text-[#b85c4a] underline">Ver el negocio</Link>
            <Link to={`/${lang}/platform-admin/negocios`} className="underline">Volver a Negocios</Link>
          </div>
        </section>
      </PlatformShell>
    );
  }

  return (
    <PlatformShell title="Nuevo negocio" subtitle="Da de alta un negocio con su Owner">
      <Link to={`/${lang}/platform-admin/negocios`} className="text-sm text-[#77736d] underline">← Negocios</Link>
      <Form method="post" className="max-w-2xl space-y-5 rounded-2xl border border-[#e8e4dc] bg-white p-6 shadow-sm">
        <fieldset className="space-y-4">
          <legend className="font-semibold">El negocio</legend>
          <label className="block text-sm">
            Nombre
            <input
              name="nombre"
              required
              minLength={2}
              maxLength={120}
              className={`${field} mt-1`}
              placeholder="Ej.: Otra Ronda Más"
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value);
                if (!slugTouched) setSlug(slugFrom(e.target.value));
              }}
            />
          </label>
          <label className="block text-sm">
            Dirección de la tienda
            <span className="mt-1 flex items-center gap-1 text-sm text-[#77736d]">
              app.wapsell.com/tienda/
              <input
                name="slug"
                required
                minLength={3}
                maxLength={40}
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                className={field}
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
              />
            </span>
            <small className="text-xs text-[#96918a]">Minúsculas, números y guiones. Después no se cambia: los enlaces compartidos dependen de ella.</small>
          </label>
        </fieldset>
        <fieldset className="space-y-4">
          <legend className="font-semibold">El Owner</legend>
          <label className="block text-sm">
            Nombre y apellido
            <input name="ownerNombre" required minLength={2} maxLength={120} className={`${field} mt-1`} />
          </label>
          <label className="block text-sm">
            Email
            <input name="ownerEmail" type="email" required maxLength={200} className={`${field} mt-1`} />
            <small className="text-xs text-[#96918a]">Le llega un mail para crear su contraseña (vence en 7 días).</small>
          </label>
        </fieldset>
        {result && !result.ok ? (
          <p role="alert" className="rounded-xl bg-[#fdecea] px-4 py-3 text-sm text-[#8a2c1d]">{result.message}</p>
        ) : null}
        <button type="submit" disabled={busy} className="rounded-xl bg-[#211f1b] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60">
          {busy ? 'Creando…' : 'Crear negocio'}
        </button>
      </Form>
    </PlatformShell>
  );
}
