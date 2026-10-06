import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

/**
 * RF-17 (docs/spec-login-roles.md, resolved decision D-20): Resend for the
 * invitation link and dossier expiry alerts — no general notification
 * system is designed yet (D-13 of the SDD still leaves the channel/provider
 * undefined for the rest of the events), this service is of limited use
 * for those two cases.
 *
 * `RESEND_API_KEY`/`RESEND_FROM_EMAIL` missing: it does not fail the whole
 * server startup (unlike JWT_SECRET) — sending emails is an add-on, not
 * something that should take down the whole API if it is missing. Instead,
 * each send attempt without the complete config logs the error and returns
 * `enviado: false`, so the caller (InvitationsService) decides how to
 * react (e.g. still create the invitation and show the link in the panel to
 * copy by hand).
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend | null = null;

  private customer(): Resend | null {
    if (this.resend) return this.resend;
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY no configurado — no se pueden enviar emails.');
      return null;
    }
    this.resend = new Resend(apiKey);
    return this.resend;
  }

  async send(recipient: string, subject: string, html: string): Promise<boolean> {
    const customer = this.customer();
    const from = process.env.RESEND_FROM_EMAIL;
    if (!customer || !from) {
      if (!from) this.logger.warn('RESEND_FROM_EMAIL no configurado — no se pueden enviar emails.');
      return false;
    }

    try {
      const { error } = await customer.emails.send({
        from,
        to: recipient,
        subject: subject,
        html,
      });
      if (error) {
        this.logger.error(`Error enviando email a ${recipient}: ${error.message}`);
        return false;
      }
      return true;
    } catch (err) {
      this.logger.error(`Excepción enviando email a ${recipient}`, err as Error);
      return false;
    }
  }
}
