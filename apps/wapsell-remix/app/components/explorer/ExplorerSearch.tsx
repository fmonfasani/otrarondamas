import { Form, useFetcher, useNavigate } from '@remix-run/react';
import { useEffect, useId, useState, type KeyboardEvent } from 'react';
import { Search } from 'lucide-react';
import { formatMoney } from '~/utils/format';
import type { ExplorerSuggestions } from '~/utils/explorer';

type Option = { key: string; href: string; label: string; detail: string };

/**
 * Marketplace, step 3 — Wapsell's search box (Explorar and /buscar). It suggests products, stores
 * and brands while the customer types (from two letters); Enter searches every store. The
 * suggestions are a listbox driven with the arrows, Enter and Escape; without JavaScript it is a
 * plain search form. `keep` carries the filters already chosen into a new search.
 */
export function ExplorerSearch({ defaultValue = '', keep = [] }: Readonly<{ defaultValue?: string; keep?: Array<[string, string]> }>) {
  const fetcher = useFetcher<ExplorerSuggestions>();
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
      fetcher.load(`/explorar/sugerencias?q=${encodeURIComponent(q)}`);
      setOpen(true);
      setActive(-1);
    }, 220);
    return () => window.clearTimeout(timer);
    // Only the typed text triggers a new lookup.
  }, [value]);

  // Only the suggestions of what is typed now, never those of the previous text.
  const data = fetcher.data?.q === value.trim() ? fetcher.data : undefined;
  const options: Option[] = [
    ...(data?.negocios ?? []).map((n) => ({ key: `n-${n.slug}`, href: `/tienda/${n.slug}`, label: n.nombre, detail: n.rubro ?? 'Negocio' })),
    ...(data?.marcas ?? []).map((m) => ({ key: `m-${m}`, href: `/buscar?marca=${encodeURIComponent(m)}`, label: m, detail: 'Marca' })),
    ...(data?.productos ?? []).map((p) => ({
      key: `p-${p.tienda.slug}-${p.productoId}`,
      href: `/tienda/${p.tienda.slug}/producto/${p.productoId}`,
      label: p.nombre,
      detail: `${formatMoney(p.precio)} · ${p.tienda.nombre}`,
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
    <Form method="get" action="/buscar" className="wx-search" role="search" onSubmit={() => setOpen(false)}>
      <Search size={18} aria-hidden="true" />
      {keep.map(([k, v]) => (
        <input key={`${k}-${v}`} type="hidden" name={k} value={v} />
      ))}
      <input
        type="search"
        name="q"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        placeholder="Buscá productos, marcas o negocios"
        aria-label="Buscá productos, marcas o negocios"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        enterKeyHint="search"
        maxLength={100}
      />
      {showList ? (
        <ul className="wx-suggest" id={listId} role="listbox" aria-label="Sugerencias">
          {options.map((option, index) => (
            <li key={option.key} id={`${listId}-${index}`} role="option" aria-selected={index === active}>
              {/* mouseDown keeps the focus, so the list does not close before the tap lands. */}
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
