/* eslint-disable @typescript-eslint/no-explicit-any -- the spike client is generated at test time */
import { Prisma } from '@prisma/client';
import { companyScopeExtension } from '../../../src/prisma/company-scope.extension';

/**
 * INIT-019 PR 3 — the candidate for how CompanyScopedPrismaService.forCompany() fixes the business
 * for row-level security in PR 5 (FASE-2 §5.2). p18-3-rls-spike.integration-spec.ts validates it
 * on Prisma 5.22; PR 5 moves it to src/prisma with the real client's types.
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
            return fn(tx);
          }, options);
        },
      },
    }),
  );
}

/**
 * forCompany() as PR 5 would build it. The scope extension (INV-01) stays as the first barrier.
 * It sits on top of the per-operation context, so its ownership lookups see the business too.
 */
export function forCompanyWithRls(base: any, businessId: string): any {
  const transactionClient = base.$extends(companyScopeExtension(businessId));
  return base
    .$extends(businessPerOperation(businessId))
    .$extends(companyScopeExtension(businessId))
    .$extends(businessOnceInTransactions(businessId, transactionClient));
}
