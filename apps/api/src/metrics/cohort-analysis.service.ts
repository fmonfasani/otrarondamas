import { Injectable } from '@nestjs/common';
// import { Prisma } from '@prisma/client'; // TODO: types
import { CompanyScopedPrismaService } from '../prisma/company-scoped-prisma.service';
import { RetentionMatrixDto, LTVMetricDto } from './dto/responses';

/**
 * P9-2 Cohort Analysis Service
 *
 * Calculates customer retention cohorts and lifetime value by signup period.
 *
 * Cohort Analysis:
 * - Cohorts are defined by customer signup date (Cliente.createdAt)
 * - Retention is tracked by identifying customers who made purchases in
 *   subsequent periods relative to their signup period.
 * - Retention % = (customers active in period N) / (total customers in cohort)
 * - Churn % = 1 - retention %
 */
@Injectable()
export class CohortAnalysisService {
  constructor(private readonly prismaFactory: CompanyScopedPrismaService) {}

  /**
   * Generate a retention matrix showing cohort-based customer retention over time.
   *
   * Returns a 2D array where:
   * - Rows represent signup cohorts (e.g., 2026-01, 2026-W01)
   * - Columns represent months/weeks since signup
   * - Cell value is the retention percentage (0-100)
   *
   * Example output:
   * ```
   * cohorts: [
   *   { cohortPeriod: '2026-01', customerCount: 50, firstPurchaseCount: 40 },
   *   { cohortPeriod: '2026-02', customerCount: 60, firstPurchaseCount: 48 },
   * ]
   * retention: [
   *   [100, 80, 70, 65],  // 2026-01: M0=100%, M1=80%, M2=70%, M3=65%
   *   [100, 75, 68, null],  // 2026-02: M0=100%, M1=75%, M2=68%, M3=null (future)
   * ]
   * churn: [
   *   [0, 20, 30, 35],
   *   [0, 25, 32, null],
   * ]
   * ```
   */
  async generateRetentionMatrix(
    companyId: string,
    cohortPeriod: 'weekly' | 'monthly',
    lookbackMonths: number = 12,
  ): Promise<RetentionMatrixDto> {
    const db = this.prismaFactory.forCompany(companyId);

    // Fetch all customers with their signup dates and purchase history
    const customers = await db.cliente.findMany({
      select: {
        id: true,
        createdAt: true,
        Venta: {
          select: {
            createdAt: true,
          },
          where: {
            estado: 'CONFIRMADA',
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    // Calculate the date range for cohorts
    const now = new Date();
    const lookbackStart = this.subtractMonths(now, lookbackMonths);

    // Build cohort structure
    const cohortMap = new Map<
      string,
      {
        customerIds: Set<string>;
        firstPurchaseDates: Map<string, Date>;
      }
    >();

    for (const customer of customers) {
      const signupDate = new Date(customer.createdAt);
      if (signupDate < lookbackStart) {
        continue; // Skip older cohorts
      }

      const cohortKey = this.formatCohortPeriod(signupDate, cohortPeriod);

      if (!cohortMap.has(cohortKey)) {
        cohortMap.set(cohortKey, {
          customerIds: new Set(),
          firstPurchaseDates: new Map(),
        });
      }

      const cohort = cohortMap.get(cohortKey)!;
      cohort.customerIds.add(customer.id);

      // First purchase date
      if (customer.Venta && customer.Venta.length > 0) {
        cohort.firstPurchaseDates.set(customer.id, new Date(customer.Venta[0].createdAt));
      }
    }

    // Sort cohorts chronologically
    const sortedCohorts = Array.from(cohortMap.entries())
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([period, data]) => ({
        period,
        customerIds: data.customerIds,
        firstPurchaseDates: data.firstPurchaseDates,
      }));

    // Build retention matrix
    const retention: number[][] = [];
    const churn: number[][] = [];
    const cohortInfos: Array<{
      cohortPeriod: string;
      customerCount: number;
      firstPurchaseCount: number;
    }> = [];

    const offsetCount = Math.ceil(lookbackMonths * (cohortPeriod === 'weekly' ? 4.33 : 1) * 1.2); // Max offsets to track

    for (const [idx, cohort] of sortedCohorts.entries()) {
      const cohortStartDate = this.parseCohortPeriod(cohort.period, cohortPeriod);
      const cohortEndDate = this.addCohortPeriod(cohortStartDate, cohortPeriod, 1);

      const totalCustomersInCohort = cohort.customerIds.size;
      const firstPurchaseCount = cohort.firstPurchaseDates.size;

      cohortInfos.push({
        cohortPeriod: cohort.period,
        customerCount: totalCustomersInCohort,
        firstPurchaseCount,
      });

      const cohortRetention: number[] = [];
      const cohortChurn: number[] = [];

      // For each offset period (month/week after signup)
      for (let offset = 0; offset < offsetCount; offset++) {
        const offsetStartDate = this.addCohortPeriod(cohortStartDate, cohortPeriod, offset);
        const offsetEndDate = this.addCohortPeriod(cohortStartDate, cohortPeriod, offset + 1);

        // Check if offset period is in the future
        if (offsetStartDate > now) {
          cohortRetention.push(null as any); // null for future periods
          cohortChurn.push(null as any);
          continue;
        }

        // Count customers from this cohort who had activity (purchase) in this offset period
        let customersActiveInOffset = 0;

        for (const [customerId, firstPurchaseDate] of cohort.firstPurchaseDates) {
          if (firstPurchaseDate >= offsetStartDate && firstPurchaseDate < offsetEndDate) {
            customersActiveInOffset++;
          }
        }

        // For offset 0, use first purchase count; for later offsets, check repeat purchases
        if (offset === 0) {
          customersActiveInOffset = firstPurchaseCount;
        } else {
          // Get repeat purchase count (customers who purchased again)
          const fullCustomer = customers.find((c) => c.id === Array.from(cohort.customerIds)[0]);
          // Recalculate active customers in offset period
          customersActiveInOffset = 0;
          for (const customerId of cohort.customerIds) {
            const customer = customers.find((c) => c.id === customerId);
            if (customer) {
              const purchasesInOffset = customer.Venta.filter(
                (v) =>
                  new Date(v.createdAt) >= offsetStartDate && new Date(v.createdAt) < offsetEndDate,
              );
              if (purchasesInOffset.length > 0) {
                customersActiveInOffset++;
              }
            }
          }
        }

        const retentionRate =
          totalCustomersInCohort > 0 ? (customersActiveInOffset / totalCustomersInCohort) * 100 : 0;
        const churnRate = 100 - retentionRate;

        cohortRetention.push(Number(retentionRate.toFixed(2)));
        cohortChurn.push(Number(churnRate.toFixed(2)));
      }

      retention.push(cohortRetention);
      churn.push(cohortChurn);
    }

    const totalCustomers = customers.length;

    return {
      cohorts: cohortInfos,
      retention,
      churn,
      cohortPeriod,
      totalCustomers,
    };
  }

  /**
   * Calculate Lifetime Value (LTV) for a customer cohort.
   *
   * LTV = Total revenue from cohort / Number of customers in cohort
   */
  async getCohortLTV(
    companyId: string,
    cohortStartDate: Date,
    cohortEndDate: Date,
    lookbackMonths: number = 12,
  ): Promise<LTVMetricDto> {
    const db = this.prismaFactory.forCompany(companyId);

    // Get all customers who signed up in the cohort period
    const customers = await db.cliente.findMany({
      where: {
        createdAt: { gte: cohortStartDate, lte: cohortEndDate },
      },
      select: {
        id: true,
        createdAt: true,
        Venta: {
          where: {
            estado: 'CONFIRMADA',
          },
          select: {
            total: true,
            descuento: true,
            createdAt: true,
          },
        },
      },
    });

    const customerCount = customers.length;

    if (customerCount === 0) {
      return {
        ltv: 0,
        totalRevenue: 0,
        customerCount: 0,
        medianLTV: 0,
        minLTV: 0,
        maxLTV: 0,
        cohortPeriod: `${cohortStartDate.toISOString().split('T')[0]} to ${cohortEndDate.toISOString().split('T')[0]}`,
        ltvByAge: [],
      };
    }

    // Calculate total revenue per customer
    const customerLTVs: number[] = [];
    let totalRevenue = 0;

    for (const customer of customers) {
      let customerRevenue = 0;
      for (const venta of customer.Venta) {
        const revenue = Number(
          new any(String(venta.total))
            .minus(new any(String(venta.descuento || 0)))
            .toFixed(2),
        );
        customerRevenue += revenue;
      }
      customerLTVs.push(customerRevenue);
      totalRevenue += customerRevenue;
    }

    // Calculate statistics
    const ltv = totalRevenue / customerCount;
    const sorted = [...customerLTVs].sort((a, b) => a - b);
    const medianLTV =
      sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];
    const minLTV = Math.min(...customerLTVs);
    const maxLTV = Math.max(...customerLTVs);

    // LTV by age (months since signup)
    const ltvByAge: Array<{ ageMonths: number; ltv: number; activeCustomers: number }> = [];
    const maxMonths = Math.min(lookbackMonths, 36);

    for (let month = 0; month < maxMonths; month++) {
      const monthStart = this.subtractMonths(new Date(), lookbackMonths - month);
      const monthEnd = this.subtractMonths(new Date(), lookbackMonths - month - 1);

      let revenueInMonth = 0;
      let activeCustomers = 0;

      for (const customer of customers) {
        const customerRevenuInMonth = customer.Venta.reduce((sum, venta) => {
          const ventaDate = new Date(venta.createdAt);
          if (ventaDate >= monthStart && ventaDate < monthEnd) {
            return (
              sum +
              Number(
                new any(String(venta.total))
                  .minus(new any(String(venta.descuento || 0)))
                  .toFixed(2),
              )
            );
          }
          return sum;
        }, 0);

        if (customerRevenuInMonth > 0) {
          revenueInMonth += customerRevenuInMonth;
          activeCustomers++;
        }
      }

      if (activeCustomers > 0) {
        ltvByAge.push({
          ageMonths: month,
          ltv: Number((revenueInMonth / activeCustomers).toFixed(2)),
          activeCustomers,
        });
      }
    }

    const cohortPeriodStr = `${cohortStartDate.toISOString().split('T')[0]} to ${cohortEndDate.toISOString().split('T')[0]}`;

    return {
      ltv: Number(ltv.toFixed(2)),
      totalRevenue: Number(totalRevenue.toFixed(2)),
      customerCount,
      medianLTV: Number(medianLTV.toFixed(2)),
      minLTV: Number(minLTV.toFixed(2)),
      maxLTV: Number(maxLTV.toFixed(2)),
      cohortPeriod: cohortPeriodStr,
      ltvByAge,
    };
  }

  /**
   * Helper: Format date to cohort period (YYYY-MM or YYYY-WXX).
   */
  private formatCohortPeriod(date: Date, period: 'weekly' | 'monthly'): string {
    const d = new Date(date);
    if (period === 'weekly') {
      const startOfYear = new Date(d.getFullYear(), 0, 1);
      const days = Math.floor((d.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
      const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
      return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
    }
    // monthly
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * Helper: Parse cohort period string back to a Date.
   */
  private parseCohortPeriod(period: string, cohortPeriod: 'weekly' | 'monthly'): Date {
    if (cohortPeriod === 'monthly') {
      const [year, month] = period.split('-').map(Number);
      return new Date(year, month - 1, 1);
    }

    // weekly
    const [year, weekStr] = period.split('-');
    const week = Number(weekStr.substring(1));
    const yearNum = Number(year);
    const startOfYear = new Date(yearNum, 0, 1);
    const dayOfWeek = startOfYear.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const firstMonday = new Date(startOfYear);
    firstMonday.setDate(startOfYear.getDate() - daysToMonday);
    const result = new Date(firstMonday);
    result.setDate(firstMonday.getDate() + (week - 1) * 7);
    return result;
  }

  /**
   * Helper: Add (or subtract if negative) a cohort period to a date.
   */
  private addCohortPeriod(date: Date, cohortPeriod: 'weekly' | 'monthly', offset: number): Date {
    const result = new Date(date);
    if (cohortPeriod === 'monthly') {
      result.setMonth(result.getMonth() + offset);
    } else {
      result.setDate(result.getDate() + offset * 7);
    }
    return result;
  }

  /**
   * Helper: Subtract months from a date.
   */
  private subtractMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() - months);
    return result;
  }
}
