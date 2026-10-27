import { Outlet, useParams } from '@remix-run/react';
import type { LoaderFunction } from '@remix-run/node';

export const loader: LoaderFunction = async ({ params }) => {
  const validLocales = ['es', 'en'];
  const locale = validLocales.includes(params.lang as string)
    ? params.lang
    : 'es';

  return { locale };
};

export default function LocaleLayout() {
  const { lang } = useParams();

  return (
    <div data-locale={lang}>
      <Outlet />
    </div>
  );
}
