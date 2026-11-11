import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { resetEmailHtml } from './password-reset.service';
import { ResetPasswordDto } from './dto/password-reset.dto';

describe('password reset email and DTOs', () => {
  it('escapes the name and the link in the email', () => {
    const html = resetEmailHtml('<b>Lucía</b> Pérez', 'https://app.test/x?token=a"b');
    expect(html).not.toContain('<b>Lucía</b>');
    expect(html).toContain('&#60;b&#62;Lucía&#60;/b&#62;');
    expect(html).toContain('token=a&#34;b');
    expect(html).toContain('#d97757');
  });

  it('requires a password of 8 to 72 characters', async () => {
    const errors = async (password: string) =>
      validate(plainToInstance(ResetPasswordDto, { token: 'x'.repeat(43), password }));
    expect(await errors('corta')).not.toEqual([]);
    expect(await errors('x'.repeat(73))).not.toEqual([]);
    expect(await errors('suficiente')).toEqual([]);
  });
});
