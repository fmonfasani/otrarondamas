/* eslint-disable @typescript-eslint/no-explicit-any -- Prisma's extension types do not compose
   across three $extends calls on a generated client; the shapes are checked by the RLS suites. */
import { Prisma, type PrismaClient } from '@prisma/client';
import { companyScopeExtension } from './company-scope.extension';

/**
 * INIT-019 PR 5 (FASE-2-BASE-SEGURA §5.2, validated by the p18-3 spike on Prisma 5.22): how a
 * client connected as `wapsell_app` fixes the business that row-level security checks.
 *
 * The policies read the setting `app.business_id`. set_config(..., true) scopes it to the current
 * transaction, so a pooled connection never carries one business into the next request.
 */
export function setBusiness(client: any, businessId: string): Prisma.PrismaPromise<number> {
  return client.$executeRaw`SELECT set_config('app.business_id', ${businessId}, true)`;
}

/**
 * Outside a transaction, every operation (model queries and raw SQL alike) runs in a short batch
 * transaction: set_config first, then the query.
 */
export function businessPerOperation(businessId: string) {
  return Prisma.defineExtension((client) =>
    client.$extends({
      name: 'business-per-operation',
      query: {
        async $allOperations({ args, query }) {
          const [, result] = await client.$transaction([
            setBusiness(client, businessId),
            query(args),
          ]);
          return result;
        },
      },
    }),
  );
}

/**
 * Interactive transactions fix the business once, when they begin, and run on a client that does
 * not carry businessPerOperation. If an operation inside opened its own short transaction, it
 * would leave the interactive one: it would hang, or commit even when the transaction rolls back.
 * Batch transactions are rejected; the scoped client does not use them.
 */
export function businessOnceInTransactions(businessId: string, transactionClient: any) {
  return Prisma.defineExtension((client) =>
    client.$extends({
      name: 'business-once-in-transactions',
      client: {
        $transaction(fn: unknown, options?: unknown) {
          if (typeof fn !== 'function') {
            throw new TypeError(
              'El cliente con filtro de negocio no admite transacciones por lote: usá una transacción interactiva.',
            );
          }
          return transactionClient.$transaction(async (tx: any) => {
            await setBusiness(tx, businessId);
            return (fn as (tx: unknown) => unknown)(tx);
          }, options);
        },
      },
    }),
  );
}

/**
 * The scoped client: the business filter of companyScopeExtension (INV-01) stays as the first
 * barrier, and row-level security is the second, enforced by the database itself.
 */
export function forCompanyWithRls(base: PrismaClient, businessId: string) {
  // Same type as before PR 5: callers see the scoped client; the RLS layers add no API.
  const scoped = base.$extends(companyScopeExtension(businessId));
  return base
    .$extends(businessPerOperation(businessId))
    .$extends(companyScopeExtension(businessId))
    .$extends(businessOnceInTransactions(businessId, scoped)) as unknown as typeof scoped;
}
