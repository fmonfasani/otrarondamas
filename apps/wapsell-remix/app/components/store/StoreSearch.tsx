import { Form, useFetcher, useNavigate } from '@remix-run/react';
import { useEffect, useId, useState, type KeyboardEvent } from 'react';
import { formatMoney } from '~/utils/format';
import { productHref, type Suggestions } from '~/utils/store-browse';

type Option = { key: string; href: string; label: string; detail: string };

/**
 * OR-B4-047 — the store's search box. It searches the name, the brand and the code without minding
 * accents, and suggests products and categories while the customer types (from two letters). The
 * suggestions are a listbox driven with the arrows, Enter and Escape; without JavaScript the box is a
 * plain search form. A new search keeps only the chosen order.
 */
export function StoreSearch({ slug, defaultValue, orden }: Readonly<{ slug: string; defaultValue: string; orden: string | null }>) {
  const fetcher = useFetcher<Suggestions>();
  const navigate = useNavigate();
  const listId = useId();
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  useEffect(() => setValue(defaultValue), [defaultValue]);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 2 || q === defaultValue) return;
    const timer = window.setTimeout(() => {
      fetcher.load(`/tienda/${slug}/sugerencias?q=${encodeURIComponent(q)}`);
      setOpen(true);
      setActive(-1);
    }, 250);
    return () => window.clearTimeout(timer);
    // Only the typed text triggers a new lookup.
  }, [value]);

  // Only the suggestions of what is typed now: while a new lookup runs, the old ones go away, so
  // the arrows and Enter never open a product of the previous text.
  const data = fetcher.data?.q === value.trim() ? fetcher.data : undefined;
  const options: Option[] = [
    ...(data?.categorias ?? []).map((c) => ({ key: `c-${c.id}`, href: `/tienda/${slug}?cat=${c.id}`, label: c.nombre, detail: 'Categoría' })),
    ...(data?.productos ?? []).map((p) => ({
      key: `p-${p.productoId}`,
      href: productHref(slug, p.productoId),
      label: p.nombre,
      detail: formatMoney(p.precio),
    })),
  ];
  const showList = open && options.length > 0;

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!showList) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((current) => (current + step + options.length) % options.length);
    } else if (event.key === 'Enter' && active >= 0) {
      event.preventDefault();
      setOpen(false);
      navigate(options[active].href);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <Form method="get" action={`/tienda/${slug}`} className="search-form" role="search" onSubmit={() => setOpen(false)}>
      <span aria-hidden="true">⌕</span>
      {orden ? <input type="hidden" name="orden" value={orden} /> : null}
      <input
        type="search"
        name="q"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        placeholder="¿Qué estás buscando?"
        aria-label="Buscar productos"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        maxLength={100}
      />
      <button type="submit">Buscar</button>
      {showList ? (
        <ul className="search-suggestions" id={listId} role="listbox" aria-label="Sugerencias">
          {options.map((option, index) => (
            <li key={option.key} id={`${listId}-${index}`} role="option" aria-selected={index === active}>
              {/* mouseDown keeps the focus, so the list does not close before the click lands. */}
              <a href={option.href} onMouseDown={(event) => event.preventDefault()} onClick={() => setOpen(false)}>
                <span>{option.label}</span>
                <small>{option.detail}</small>
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </Form>
  );
}
