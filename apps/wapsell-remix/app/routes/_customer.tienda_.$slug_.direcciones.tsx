import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/node';
import { ApiError } from '~/services/api.server';
import { getStoreCustomer } from '~/services/customer-session.server';
import { customerAddresses, removeCustomerAddress, saveCustomerAddress } from '~/services/store.server';
import { parsePoint } from '~/utils/map';

/**
 * OR-B4-054, fase 2b — the addresses saved in the customer's Wapsell account, for the cart's
 * delivery step. An account of this store alone has none and cannot save them (puedeGuardar).
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const slug = params.slug ?? '';
  const customer = await getStoreCustomer(request, slug);
  if (!customer) return json({ direcciones: [], puedeGuardar: false });
  try {
    return json(await customerAddresses(customer.jwt, slug));
  } catch {
    return json({ direcciones: [], puedeGuardar: false });
  }
}

const text = (value: FormDataEntryValue | null) => (typeof value === 'string' ? value.trim() : '');

export async function action({ request, params }: ActionFunctionArgs) {
  const slug = params.slug ?? '';
  const form = await request.formData();
  const intent = text(form.get('intent'));
  const customer = await getStoreCustomer(request, slug);
  if (!customer) return json({ intent, ok: false, message: 'Ingresá a tu cuenta.' }, { status: 401 });
  try {
    if (intent === 'save-address') {
      const point = parsePoint(form.get('lat'), form.get('lng'));
      if (!point) return json({ intent, ok: false, message: 'Ese punto no está en Argentina. Mové el pin a tu dirección.' }, { status: 400 });
      const saved = await saveCustomerAddress(customer.jwt, slug, {
        etiqueta: text(form.get('etiqueta')) || 'Casa',
        direccion: text(form.get('direccion')),
        indicaciones: text(form.get('indicaciones')) || null,
        ...point,
      });
      return json({ intent, ok: true, message: `Guardamos «${saved.etiqueta}» en tu cuenta.` });
    }
    if (intent === 'remove-address') {
      await removeCustomerAddress(customer.jwt, slug, text(form.get('id')));
      return json({ intent, ok: true, message: 'Borramos la dirección.' });
    }
  } catch (error) {
    if (error instanceof ApiError) return json({ intent, ok: false, message: error.message }, { status: error.status });
    throw error;
  }
  return json({ intent, ok: false, message: 'Acción desconocida.' }, { status: 400 });
}
