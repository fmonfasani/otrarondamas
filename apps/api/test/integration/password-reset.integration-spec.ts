import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../src/prisma/prisma.service';
import type { EmailService } from '../../src/email/email.service';
import {
  PASSWORD_RESET_COOLDOWN_MS,
  PASSWORD_RESET_TTL_MS,
  PasswordResetService,
} from '../../src/auth/password-reset.service';

// Figma "Recuperar contraseña" → "Revisa tu correo" → "Nueva contraseña", against a real
// database: single-use, expiring links that never reveal whether an account exists.
describe('Password reset (staff)', () => {
  const tag = randomUUID().slice(0, 8);
  let prisma: PrismaService;
  let service: PasswordResetService;
  let empresaId: string;
  let sent: { to: string; html: string }[];
  const email = `reset-${tag}@example.test`;
  const inactiveEmail = `reset-inactive-${tag}@example.test`;
  let usuarioId: string;

  const tokenFrom = (html: string) => {
    const match = /nueva-contrasena\?token=([A-Za-z0-9_-]+)/.exec(html);
    if (!match) throw new Error('no reset link in the email');
    return decodeURIComponent(match[1]);
  };

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    const fakeEmail = {
      send: async (to: string, _subject: string, html: string) => {
        sent.push({ to, html });
        return true;
      },
    } as unknown as EmailService;
    service = new PasswordResetService(prisma, fakeEmail);
    empresaId = (
      await prisma.empresa.create({
        data: { nombre: `Reset ${tag}`, slug: `reset-${tag}`, configuracion: {} },
        select: { id: true },
      })
    ).id;
    usuarioId = (
      await prisma.usuario.create({
        data: {
          empresaId,
          nombre: 'Lucía Pérez',
          email,
          rol: 'OWNER',
          activo: true,
          passwordHash: await bcrypt.hash('vieja-clave-123', 10),
        },
        select: { id: true },
      })
    ).id;
    await prisma.usuario.create({
      data: { empresaId, nombre: 'Inactivo', email: inactiveEmail, rol: 'VENDEDOR', activo: false },
    });
  });

  beforeEach(() => {
    sent = [];
  });

  afterAll(async () => {
    if (empresaId) {
      await prisma.passwordResetToken.deleteMany({ where: { Usuario: { empresaId } } });
      await prisma.usuario.deleteMany({ where: { empresaId } });
      await prisma.empresa.deleteMany({ where: { id: empresaId } });
    }
    await prisma?.$disconnect();
  });

  it('sends a link for an active account, stores only its hash, and resets the password once', async () => {
    const t0 = new Date('2030-01-01T10:00:00Z');
    await service.requestReset(email, t0);
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe(email);
    const token = tokenFrom(sent[0].html);

    const stored = await prisma.passwordResetToken.findMany({ where: { usuarioId } });
    expect(stored).toHaveLength(1);
    expect(stored[0].tokenHash).not.toContain(token);
    expect(stored[0].expiresAt.getTime() - t0.getTime()).toBe(PASSWORD_RESET_TTL_MS);

    await service.resetPassword(token, 'nueva-clave-456', new Date(t0.getTime() + 60_000));
    const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: usuarioId } });
    expect(await bcrypt.compare('nueva-clave-456', usuario.passwordHash as string)).toBe(true);

    // Single use.
    await expect(
      service.resetPassword(token, 'otra-clave-789', new Date(t0.getTime() + 120_000)),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an expired link', async () => {
    const t0 = new Date('2030-01-02T10:00:00Z');
    await service.requestReset(email, t0);
    const token = tokenFrom(sent[0].html);
    await expect(
      service.resetPassword(
        token,
        'nueva-clave-456',
        new Date(t0.getTime() + PASSWORD_RESET_TTL_MS),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('keeps only the newest link and rate-limits repeated requests', async () => {
    const t0 = new Date('2030-01-03T10:00:00Z');
    await service.requestReset(email, t0);
    await service.requestReset(email, new Date(t0.getTime() + PASSWORD_RESET_COOLDOWN_MS - 1));
    expect(sent).toHaveLength(1); // second request within the cooldown: no email

    await service.requestReset(email, new Date(t0.getTime() + PASSWORD_RESET_COOLDOWN_MS + 1));
    expect(sent).toHaveLength(2);
    const [older, newer] = sent.map((m) => tokenFrom(m.html));
    const at = new Date(t0.getTime() + PASSWORD_RESET_COOLDOWN_MS + 10_000);
    await expect(service.resetPassword(older, 'nueva-clave-456', at)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.resetPassword(newer, 'nueva-clave-456', at)).resolves.toBeUndefined();
  });

  it('does not email unknown or inactive accounts, and answers the same', async () => {
    await expect(
      service.requestReset(`nobody-${tag}@example.test`, new Date('2030-01-04T10:00:00Z')),
    ).resolves.toBeUndefined();
    await expect(
      service.requestReset(inactiveEmail, new Date('2030-01-04T10:00:00Z')),
    ).resolves.toBeUndefined();
    expect(sent).toHaveLength(0);
  });

  it('rejects an unknown token', async () => {
    await expect(service.resetPassword('x'.repeat(43), 'nueva-clave-456')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
