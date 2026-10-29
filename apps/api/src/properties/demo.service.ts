import {
  Injectable,
  BadRequestException,
  ConflictException,
  UnprocessableEntityException,
  GoneException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';

/**
 * Demo Contact & Email Verification Service
 * Handles lead capture, email verification, and Resend API integration
 */
@Injectable()
export class DemoService {
  private readonly VERIFICATION_TOKEN_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'demo-secret-key';
  private readonly RESEND_API_KEY = process.env.RESEND_API_KEY || '';

  constructor(private prisma: PrismaService) {}

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone format (basic validation)
   * Accepts international format: +XX-XXXXX, (XXX)XXX-XXXX, XXXXXXXXXX
   */
  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^[\d\s\-().+]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 7;
  }

  /**
   * Hash token for storage (SHA256)
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generate JWT verification token
   */
  private generateVerificationToken(email: string): string {
    return jwt.sign(
      {
        email,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
      },
      this.JWT_SECRET,
      { subject: email },
    );
  }

  /**
   * Verify JWT token
   */
  private verifyToken(token: string): { email: string } | null {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as {
        email: string;
      };
      return decoded;
    } catch {
      return null;
    }
  }

  /**
   * Save contact lead to database
   * Validates: email format, phone format, required fields
   */
  async saveContact(data: {
    name: string;
    email: string;
    phone: string;
    message: string;
    propertyId?: string;
    ipAddress?: string;
  }): Promise<{ lead_id: string }> {
    // Validate required fields
    if (!data.name || !data.name.trim()) {
      throw new BadRequestException('Name is required');
    }
    if (!data.email || !data.email.trim()) {
      throw new BadRequestException('Email is required');
    }
    if (!data.phone || !data.phone.trim()) {
      throw new BadRequestException('Phone is required');
    }
    if (!data.message || !data.message.trim()) {
      throw new BadRequestException('Message is required');
    }

    // Validate email format
    if (!this.isValidEmail(data.email)) {
      throw new BadRequestException('Invalid email format');
    }

    // Validate phone format
    if (!this.isValidPhone(data.phone)) {
      throw new BadRequestException('Invalid phone format');
    }

    // Check if property exists (if provided)
    if (data.propertyId) {
      const property = await this.prisma.property.findUnique({
        where: { id: data.propertyId },
      });
      if (!property || property.deletedAt) {
        throw new BadRequestException('Property not found');
      }
    }

    // Generate verification token
    const verificationToken = this.generateVerificationToken(data.email);
    const tokenHash = this.hashToken(verificationToken);
    const tokenExpiresAt = new Date(Date.now() + this.VERIFICATION_TOKEN_TTL);

    // Save lead to database
    const lead = await this.prisma.lead.create({
      data: {
        name: data.name.trim(),
        email: data.email.toLowerCase(),
        phone: data.phone.trim(),
        message: data.message.trim(),
        propertyId: data.propertyId || null,
        ipAddress: data.ipAddress,
        verificationToken: tokenHash,
        tokenExpiresAt,
      },
    });

    // Send verification email
    try {
      await this.sendVerificationEmail(data.email, verificationToken);
    } catch (error) {
      // Log error but don't fail the contact save
      console.error('Failed to send verification email:', error);
      // In production, consider retrying or using a queue
    }

    return { lead_id: lead.id };
  }

  /**
   * Send verification email via Resend API
   */
  async sendVerificationEmail(email: string, token: string): Promise<void> {
    if (!this.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured, skipping email send');
      return;
    }

    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${encodeURIComponent(token)}`;

    const emailPayload = {
      from: process.env.RESEND_FROM_EMAIL || 'noreply@wapsell.com',
      to: email,
      subject: 'Verify Your Email Address - Wapsell',
      html: this.getVerificationEmailTemplate(verificationUrl),
    };

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new UnprocessableEntityException(
          `Resend API error: ${errorData.message || 'Failed to send email'}`,
        );
      }
    } catch (error) {
      if (error instanceof UnprocessableEntityException) {
        throw error;
      }
      throw new UnprocessableEntityException(
        `Failed to send verification email: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get HTML template for verification email
   */
  private getVerificationEmailTemplate(verificationUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f0f0f0; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; margin-top: 20px; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Wapsell!</h1>
            </div>

            <p>Thank you for contacting us about our properties. Please verify your email address to continue.</p>

            <a href="${verificationUrl}" class="button">Verify Email Address</a>

            <p style="margin-top: 20px; font-size: 12px; color: #666;">
              If the button above doesn't work, copy and paste this link into your browser:
              <br><a href="${verificationUrl}">${verificationUrl}</a>
            </p>

            <p>This link will expire in 24 hours.</p>

            <div class="footer">
              <p>If you did not submit this request, please ignore this email.</p>
              <p>&copy; 2026 Wapsell. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Verify email with JWT token
   * Idempotent: same token = same response
   */
  async verifyEmail(token: string): Promise<{ message: string; verified: boolean }> {
    if (!token || !token.trim()) {
      throw new BadRequestException('Token is required');
    }

    // Verify JWT
    const decoded = this.verifyToken(token);
    if (!decoded) {
      throw new BadRequestException('Invalid or expired token');
    }

    const { email } = decoded;

    // Find lead with matching email
    const lead = await this.prisma.lead.findFirst({
      where: {
        email: email.toLowerCase(),
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!lead) {
      throw new BadRequestException('No contact found with this email');
    }

    // Check if token is expired
    if (lead.tokenExpiresAt && lead.tokenExpiresAt < new Date()) {
      throw new GoneException('Verification token has expired');
    }

    // Idempotent: if already verified, return success
    if (lead.verifiedAt) {
      return {
        message: 'Email already verified',
        verified: true,
      };
    }

    // Mark as verified
    await this.prisma.lead.update({
      where: { id: lead.id },
      data: {
        verifiedAt: new Date(),
      },
    });

    return {
      message: 'Email verified successfully',
      verified: true,
    };
  }

  /**
   * Get verification token for an email (for testing/debugging)
   * Note: This should be removed in production or protected
   */
  async getVerificationToken(email: string): Promise<string> {
    return this.generateVerificationToken(email);
  }
}
