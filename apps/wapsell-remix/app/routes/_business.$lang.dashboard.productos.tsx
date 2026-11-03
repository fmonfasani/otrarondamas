import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { requireAuth } from '~/services/auth.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await requireAuth(request);
  return json({ available: false });
}

export async function action({ request }: ActionFunctionArgs) {
  await requireAuth(request);
  throw new Response('Product management is not connected to a verified NestJS API contract yet.', {
    status: 501,
  });
}

export default function ProductsPage() {
  const { available } = useLoaderData<typeof loader>();
  return (
    <section className="p-8" aria-live="polite">
      <h1 className="mb-3 text-3xl font-bold text-gray-900">Productos</h1>
      {!available ? (
        <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
          La gestión de productos todavía no está conectada a la API. No se muestran datos de ejemplo.
        </p>
      ) : null}
    </section>
  );
}
