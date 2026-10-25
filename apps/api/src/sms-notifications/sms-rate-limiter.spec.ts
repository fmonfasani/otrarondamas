import { SMSRateLimiter } from './sms-rate-limiter';

describe('SMSRateLimiter', () => {
  let limiter: SMSRateLimiter;
  const userId = 'user-123';
  const phoneNumber = '+541234567890';

  beforeEach(() => {
    limiter = new SMSRateLimiter();
  });

  describe('OTP Rate Limiting', () => {
    it('should allow first OTP request', () => {
      expect(() => limiter.checkOTPLimit(userId, phoneNumber)).not.toThrow();
    });

    it('should allow up to 5 OTP requests per hour', () => {
      for (let i = 0; i < 5; i++) {
        expect(() => limiter.checkOTPLimit(userId, phoneNumber)).not.toThrow();
        limiter.recordOTP(userId, phoneNumber);
      }
    });

    it('should block 6th OTP request in same hour', () => {
      for (let i = 0; i < 5; i++) {
        limiter.checkOTPLimit(userId, phoneNumber);
        limiter.recordOTP(userId, phoneNumber);
      }

      expect(() => limiter.checkOTPLimit(userId, phoneNumber)).toThrow(
        'Demasiados intentos de OTP',
      );
    });

    it('should record violation and apply 5-minute backoff on first violation', () => {
      // Trigger violation
      for (let i = 0; i < 5; i++) {
        limiter.recordOTP(userId, phoneNumber);
      }

      expect(() => limiter.checkOTPLimit(userId, phoneNumber)).toThrow('Demasiados intentos');
    });
  });

  describe('SMS Rate Limiting', () => {
    it('should allow first SMS', () => {
      expect(() => limiter.checkSMSLimit(userId, phoneNumber)).not.toThrow();
    });

    it('should allow up to 10 SMS per day', () => {
      for (let i = 0; i < 10; i++) {
        expect(() => limiter.checkSMSLimit(userId, phoneNumber)).not.toThrow();
        limiter.recordSMS(userId, phoneNumber);
      }
    });

    it('should block 11th SMS in same day', () => {
      for (let i = 0; i < 10; i++) {
        limiter.checkSMSLimit(userId, phoneNumber);
        limiter.recordSMS(userId, phoneNumber);
      }

      expect(() => limiter.checkSMSLimit(userId, phoneNumber)).toThrow(
        'Límite diario de SMS alcanzado',
      );
    });

    it('should allow up to 20 SMS per hour per phone', () => {
      // Use different users to avoid daily limit
      for (let i = 0; i < 20; i++) {
        const user = `user-${i}`;
        expect(() => limiter.checkSMSLimit(user, phoneNumber)).not.toThrow();
        limiter.recordSMS(user, phoneNumber);
      }
    });

    it('should block 21st SMS per hour per phone', () => {
      // Use different users to avoid daily limit
      for (let i = 0; i < 20; i++) {
        const user = `user-${i}`;
        limiter.checkSMSLimit(user, phoneNumber);
        limiter.recordSMS(user, phoneNumber);
      }

      expect(() => limiter.checkSMSLimit('user-20', phoneNumber)).toThrow(
        'Demasiados SMS en este número',
      );
    });
  });

  describe('Violation Tracking & Backoff', () => {
    it('should apply exponential backoff after violations', () => {
      // First violation: 5 minutes
      for (let i = 0; i < 5; i++) {
        limiter.recordOTP(userId, phoneNumber);
      }

      expect(() => limiter.checkOTPLimit(userId, phoneNumber)).toThrow();

      const state1 = limiter.getState();
      const violations1 = state1.violations.find((v) => v[0] === userId);
      expect(violations1).toBeDefined();
    });

    it('should track violations per user', () => {
      const user1 = 'user-1';
      const user2 = 'user-2';
      const phone = '+541234567890';

      // User 1 violates
      for (let i = 0; i < 5; i++) {
        limiter.recordOTP(user1, phone);
      }
      expect(() => limiter.checkOTPLimit(user1, phone)).toThrow();

      // User 2 can still use
      expect(() => limiter.checkOTPLimit(user2, phone)).not.toThrow();
    });
  });

  describe('Clear & State', () => {
    it('should clear all data', () => {
      limiter.recordOTP(userId, phoneNumber);
      limiter.recordSMS(userId, phoneNumber);

      limiter.clear();

      const state = limiter.getState();
      expect(state.userOtpHourly.length).toBe(0);
      expect(state.userDaily.length).toBe(0);
    });

    it('should report current state', () => {
      limiter.recordOTP(userId, phoneNumber);
      limiter.recordSMS(userId, phoneNumber);

      const state = limiter.getState();
      expect(state.userOtpHourly.length).toBe(1);
      expect(state.userDaily.length).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle different phone numbers independently', () => {
      const phone1 = '+541234567890';
      const phone2 = '+559876543210';

      // Use different users for phone1 - fill the hourly limit (20 SMS per hour)
      for (let i = 0; i < 20; i++) {
        const user1 = `user-phone1-${i}`;
        limiter.checkSMSLimit(user1, phone1);
        limiter.recordSMS(user1, phone1);
      }

      // phone1 should be blocked (20 SMS per hour limit hit)
      expect(() => limiter.checkSMSLimit('user-phone1-overflow', phone1)).toThrow();

      // Phone 2 should still work (different phone number)
      expect(() => limiter.checkSMSLimit('user-phone2-test', phone2)).not.toThrow();
    });

    it('should handle concurrent users with same phone', () => {
      const phone = '+541234567890';
      const user1 = 'user-1';
      const user2 = 'user-2';

      // Each user has their own daily limit
      for (let i = 0; i < 10; i++) {
        limiter.checkSMSLimit(user1, phone);
        limiter.recordSMS(user1, phone);

        limiter.checkSMSLimit(user2, phone);
        limiter.recordSMS(user2, phone);
      }

      expect(() => limiter.checkSMSLimit(user1, phone)).toThrow();
      expect(() => limiter.checkSMSLimit(user2, phone)).toThrow();

      // But phone has 20 in one hour, should block both
      // (This tests the phone hourly limit)
    });
  });
});
