import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

/**
 * RF-17 (docs/spec-login-roles.md, decisión D-20 resuelta): Resend para
 * el link de invitación y las alertas de vencimiento de legajo — no se
 * diseña un sistema de notificaciones general todavía (D-13 del SDD
 * sigue sin definir canal/proveedor para el resto de eventos), este
 * service es de uso acotado a esos dos casos.
 *
 * `RESEND_API_KEY`/`RESEND_FROM_EMAIL` ausentes: no falla el arranque
 * del servidor entero (a diferencia de JWT_SECRET) — el envío de
 * emails es un complemento, no algo que deba tumbar toda la API si
 * falta. En su lugar, cada intento de envío sin la config completa
 * loguea el error y devuelve `enviado: false`, para que el caller
 * (InvitacionesService) decida cómo reaccionar (ej. igual crear la
 * invitación y mostrar el link en el panel para copiar a mano).
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend | null = null;

  private cliente(): Resend | null {
    if (this.resend) return this.resend;
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY no configurado — no se pueden enviar emails.');
      return null;
    }
    this.resend = new Resend(apiKey);
    return this.resend;
  }

  async enviar(destinatario: string, asunto: string, html: string): Promise<boolean> {
    const cliente = this.cliente();
    const from = process.env.RESEND_FROM_EMAIL;
    if (!cliente || !from) {
      if (!from) this.logger.warn('RESEND_FROM_EMAIL no configurado — no se pueden enviar emails.');
      return false;
    }

    try {
      const { error } = await cliente.emails.send({
        from,
        to: destinatario,
        subject: asunto,
        html,
      });
      if (error) {
        this.logger.error(`Error enviando email a ${destinatario}: ${error.message}`);
        return false;
      }
      return true;
    } catch (err) {
      this.logger.error(`Excepción enviando email a ${destinatario}`, err as Error);
      return false;
    }
  }
}
