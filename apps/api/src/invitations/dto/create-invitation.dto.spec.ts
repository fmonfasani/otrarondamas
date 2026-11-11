import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateInvitationDto, INVITABLE_ROLES } from './create-invitation.dto';

// OR-B4-027 (#160): staff invitations offer the canonical staff roles only.
describe('CreateInvitationDto roles', () => {
  const errorsFor = async (rol: string) =>
    validate(plainToInstance(CreateInvitationDto, { email: 'staff@example.test', rol }));

  it('offers ADMIN, VENDEDOR and GESTOR_DE_STOCK', async () => {
    expect([...INVITABLE_ROLES]).toEqual(['ADMIN', 'VENDEDOR', 'GESTOR_DE_STOCK']);
    for (const rol of INVITABLE_ROLES) expect(await errorsFor(rol)).toEqual([]);
  });

  it('rejects OWNER, the ASISTENTE_LOCAL alias and the non-Membership roles', async () => {
    for (const rol of ['OWNER', 'ASISTENTE_LOCAL', 'PROVEEDOR', 'REPARTIDOR', 'SUPERUSER']) {
      expect(await errorsFor(rol)).not.toEqual([]);
    }
  });
});
