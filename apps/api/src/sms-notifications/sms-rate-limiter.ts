import { Injectable } from '@nestjs/common';

/**
 * SMS Rate Limiter — prevents abuse of SMS resources.
 *
 * Enforces per-user and per-phone limits with exponential backoff
 * for repeated violations.
 *
 * Limits:
 * - 5 OTP messages per hour per user
 * - 10 SMS per day per user
 * - 20 SMS per hour per phone number
 *
 * Backoff:
 * - First violation: 5-minute temporary block
 * - Second violation: 30-minute block
 * - Subsequent: 2-hour block
 */
@Injectable()
export class SMSRateLimiter {
  // Track SMS sent: Map<userId, { count, resetAt }>
  private userDailyLimit = new Map<string, { count: number; resetAt: number }>();

  // Track OTP sent: Map<userId_phoneNumber, { count, resetAt }>
  private userOtpHourlyLimit = new Map<string, { count: number; resetAt: number }>();

  // Track per-phone: Map<phoneNumber, { count, resetAt }>
  private phoneHourlyLimit = new Map<string, { count: number; resetAt: number }>();

  // Track violations for backoff: Map<userId, { violations, blockedUntil }>
  private violationTracker = new Map<string, { violations: number; blockedUntil: number }>();

  /**
   * Check if user can send SMS.
   * @throws Error with specific message if rate limit exceeded
   */
  checkSMSLimit(userId: string, phoneNumber: string): void {
    const now = Date.now();

    // Check if user is temporarily blocked
    const violation = this.violationTracker.get(userId);
    if (violation && now < violation.blockedUntil) {
      const waitMinutes = Math.ceil((violation.blockedUntil - now) / (1000 * 60));
      throw new Error(
        `Demasiados intentos. Por favor, intenta de nuevo en ${waitMinutes} minutos.`,
      );
    }

    // Check daily SMS limit (10 per day)
    const dailyKey = userId;
    const dailyEntry = this.userDailyLimit.get(dailyKey);
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const nextDayStart = dayStart.getTime() + 24 * 60 * 60 * 1000;

    if (dailyEntry && now < dailyEntry.resetAt) {
      if (dailyEntry.count >= 10) {
        this.recordViolation(userId);
        throw new Error('Límite diario de SMS alcanzado. Intenta de nuevo mañana.');
      }
    }

    // Check hourly phone limit (20 per hour)
    const phoneEntry = this.phoneHourlyLimit.get(phoneNumber);
    const hourStart = now - (now % (60 * 60 * 1000));
    const nextHourStart = hourStart + 60 * 60 * 1000;

    if (phoneEntry && now < phoneEntry.resetAt) {
      if (phoneEntry.count >= 20) {
        this.recordViolation(userId);
        throw new Error('Demasiados SMS en este número. Intenta de nuevo en una hora.');
      }
    }
  }

  /**
   * Check if user can request OTP (5 per hour).
   */
  checkOTPLimit(userId: string, phoneNumber: string): void {
    const now = Date.now();

    // Check if user is temporarily blocked
    const violation = this.violationTracker.get(userId);
    if (violation && now < violation.blockedUntil) {
      const waitMinutes = Math.ceil((violation.blockedUntil - now) / (1000 * 60));
      throw new Error(
        `Demasiados intentos. Por favor, intenta de nuevo en ${waitMinutes} minutos.`,
      );
    }

    const key = `${userId}_${phoneNumber}`;
    const entry = this.userOtpHourlyLimit.get(key);
    const hourStart = now - (now % (60 * 60 * 1000));
    const nextHourStart = hourStart + 60 * 60 * 1000;

    if (entry && now < entry.resetAt) {
      if (entry.count >= 5) {
        this.recordViolation(userId);
        throw new Error('Demasiados intentos de OTP. Intenta de nuevo en una hora.');
      }
    }
  }

  /**
   * Record that an SMS was sent (increment counts).
   */
  recordSMS(userId: string, phoneNumber: string): void {
    const now = Date.now();

    // Daily limit
    const dailyKey = userId;
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const nextDayStart = dayStart.getTime() + 24 * 60 * 60 * 1000;
    const dailyEntry = this.userDailyLimit.get(dailyKey);

    if (!dailyEntry || now >= dailyEntry.resetAt) {
      this.userDailyLimit.set(dailyKey, { count: 1, resetAt: nextDayStart });
    } else {
      dailyEntry.count++;
    }

    // Hourly phone limit
    const hourStart = now - (now % (60 * 60 * 1000));
    const nextHourStart = hourStart + 60 * 60 * 1000;
    const phoneEntry = this.phoneHourlyLimit.get(phoneNumber);

    if (!phoneEntry || now >= phoneEntry.resetAt) {
      this.phoneHourlyLimit.set(phoneNumber, { count: 1, resetAt: nextHourStart });
    } else {
      phoneEntry.count++;
    }
  }

  /**
   * Record that an OTP was sent (increment count).
   */
  recordOTP(userId: string, phoneNumber: string): void {
    const now = Date.now();
    const key = `${userId}_${phoneNumber}`;
    const hourStart = now - (now % (60 * 60 * 1000));
    const nextHourStart = hourStart + 60 * 60 * 1000;
    const entry = this.userOtpHourlyLimit.get(key);

    if (!entry || now >= entry.resetAt) {
      this.userOtpHourlyLimit.set(key, { count: 1, resetAt: nextHourStart });
    } else {
      entry.count++;
    }
  }

  /**
   * Record a violation and apply exponential backoff.
   */
  private recordViolation(userId: string): void {
    const now = Date.now();
    const violation = this.violationTracker.get(userId);
    let backoffMs = 5 * 60 * 1000; // 5 minutes

    if (violation) {
      violation.violations++;
      if (violation.violations === 2) {
        backoffMs = 30 * 60 * 1000; // 30 minutes
      } else if (violation.violations >= 3) {
        backoffMs = 2 * 60 * 60 * 1000; // 2 hours
      }
    } else {
      this.violationTracker.set(userId, {
        violations: 1,
        blockedUntil: now + backoffMs,
      });
      return;
    }

    violation.blockedUntil = now + backoffMs;
  }

  /**
   * Clear all tracked data (for testing).
   */
  clear(): void {
    this.userDailyLimit.clear();
    this.userOtpHourlyLimit.clear();
    this.phoneHourlyLimit.clear();
    this.violationTracker.clear();
  }

  /**
   * Get current state (for testing and monitoring).
   */
  getState() {
    return {
      userDaily: Array.from(this.userDailyLimit.entries()),
      userOtpHourly: Array.from(this.userOtpHourlyLimit.entries()),
      phoneHourly: Array.from(this.phoneHourlyLimit.entries()),
      violations: Array.from(this.violationTracker.entries()),
    };
  }
}
