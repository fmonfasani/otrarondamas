import { formatMoney } from '~/utils/format';
import {
  ORDER_STEPS,
  orderStateLabel,
  orderStep,
  orderSummary,
  orderTitle,
  type OrderCardData,
} from '~/utils/order-card';

/**
 * OR-B4-053 — the order in the chat, as the customer and the team see it: its number, what it
 * has, the total and a bar with where it is. It reads the order live, so it never goes stale.
 */
export function OrderCard({ card, time, href }: Readonly<{ card: OrderCardData; time: string; href?: string }>) {
  const step = orderStep(card.estado);
  const off = step === null;
  return (
    <article className={`order-card${off ? ' order-card--off' : ''}`} aria-label={orderTitle(card.numero)}>
      <header className="order-card__head">
        <b>{orderTitle(card.numero)}</b>
        <span className="order-card__state">{orderStateLabel(card.estado)}</span>
      </header>
      {card.items.length > 0 ? (
        <ul className="order-card__items">
          {card.items.map((item) => (
            <li key={item.producto}>
              <span>{item.producto}</span>
              <span>× {item.cantidad.toLocaleString('es-AR')}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="order-card__total">
        <span>{orderSummary(card.items)}</span>
        <b>{card.total ? formatMoney(card.total) : ''}</b>
      </p>
      {off ? null : (
        <ol className="order-card__steps" aria-label="Estado del pedido">
          {ORDER_STEPS.map((label, index) => (
            <li key={label} className={index <= (step ?? 0) ? 'is-done' : undefined} aria-current={index === step ? 'step' : undefined}>
              <span className="order-card__dot" aria-hidden="true" />
              <small>{label}</small>
            </li>
          ))}
        </ol>
      )}
      <footer className="order-card__foot">
        {href ? <a href={href}>Ver pedido</a> : <span />}
        <time>{time}</time>
      </footer>
    </article>
  );
}

/** OR-B4-053 — a notice the system posted (the order moved, a return): a short centred line. */
export function NoticeLine({ text, time }: Readonly<{ text: string; time: string }>) {
  return (
    <p className="chat-notice">
      <span>{text}</span> <time>{time}</time>
    </p>
  );
}
