import { PrismaService } from '../../src/prisma/prisma.service';

/**
 * ADR-DAT-020 (INIT-019 PR 4, module 4c: team and notices), the last module of PR 4. Role grants,
 * dossiers, user permissions, invitations, phones, SMS, e-mail, notifications, card payments and the
 * audit log reference their parents with the business in the key. Restrict both ways, except the
 * header -> lines that keep CASCADE on delete: a membership's role grant, a role grant's capabilities
 * and a payment's intents.
 *
 * One reference stays single-column on purpose (D8, Owner 2026-11-24): AuditLog.usuarioId, because a
 * business's audit log records when Wapsell's platform staff open it.
 */
const MODULE_TABLES = [
  'AuditLog',
  'RoleGrant',
  'CapabilityGrant',
  'Legajo',
  'DocumentoLegajo',
  'UsuarioPermiso',
  'Invitacion',
  'UserEmpresa',
  'PhoneNumber',
  'OTPSession',
  'SMSLog',
  'SMSAlert',
  'EmailCampaign',
  'EmailLog',
  'EmailPreference',
  'NotificationPreference',
  'NotificationDigest',
  'Notificacion',
  'Payment',
  'PaymentIntent',
  'Refund',
];

/** Global catalogs: not business tables. */
const GLOBAL_TARGETS = ['Empresa', 'RoleTemplate', 'CapabilityDefinition', 'Permiso', 'User'];

const CASCADE = [
  'CapabilityGrant_businessId_roleGrantId_fkey',
  'PaymentIntent_empresaId_paymentId_fkey',
  'RoleGrant_businessId_membershipId_fkey',
];

type Business = Awaited<ReturnType<typeof createBusiness>>;

async function createBusiness(prisma: PrismaService, label: string, suffix: number) {
  const { id } = await prisma.empresa.create({
    data: {
      nombre: `P18-9 ${label} ${suffix}`,
      slug: `p18-9-${label}-${suffix}`,
      configuracion: {},
    },
    select: { id: true },
  });
  const usuario = await prisma.usuario.create({
    data: {
      empresaId: id,
      nombre: `P18-9 ${label}`,
      email: `p18-9-${label}-${suffix}@example.test`,
    },
  });
  const customer = await prisma.cliente.create({
    data: { empresaId: id, nombre: `P18-9 Customer ${label}` },
  });
  const authorization = await prisma.autorizacion.create({
    data: { empresaId: id, autorizadorId: usuario.id, operacion: 'P18-9' },
  });
  const user = await prisma.user.create({
    data: { email: `p18-9-user-${label}-${suffix}@example.test`, nombre: `P18-9 ${label}` },
  });
  const membership = await prisma.membership.create({
    data: { userId: user.id, businessId: id, role: 'OWNER', status: 'ACTIVE' },
  });
  return {
    id,
    usuario: usuario.id,
    customer: customer.id,
    authorization: authorization.id,
    user: user.id,
    membership: membership.id,
  };
}

describe('P18-9 — claves compuestas: equipo y avisos (ADR-DAT-020, D8)', () => {
  let prisma: PrismaService;
  let suffix: number;
  let A: Business;
  let B: Business;
  let roleTemplateId: string;
  let capabilityDefId: string;
  let permisoId: string;

  const code = (error: unknown) => (error as { code?: string }).code;
  const rejection = async (promise: Promise<unknown>) => {
    try {
      await promise;
      return 'written';
    } catch (error) {
      return code(error);
    }
  };

  beforeAll(async () => {
    // The system role (wapsell_system) bypasses row security by design: the keys must hold for it too.
    prisma = new PrismaService();
    await prisma.$connect();
    suffix = Date.now();
    A = await createBusiness(prisma, 'A', suffix);
    B = await createBusiness(prisma, 'B', suffix);
    roleTemplateId = (await prisma.roleTemplate.create({ data: { name: `P18-9 role ${suffix}` } }))
      .id;
    capabilityDefId = (
      await prisma.capabilityDefinition.create({ data: { code: `p18_9_${suffix}` } })
    ).id;
    permisoId = (await prisma.permiso.create({ data: { nombre: `P18_9_${suffix}` } })).id;
  });

  afterAll(async () => {
    const empresaId = { in: [A?.id, B?.id].filter(Boolean) as string[] };
    await prisma.auditLog.deleteMany({ where: { empresaId } });
    await prisma.notificationPreference.deleteMany({ where: { empresaId } });
    await prisma.phoneNumber.deleteMany({ where: { empresaId } });
    await prisma.invitacion.deleteMany({ where: { empresaId } });
    await prisma.usuarioPermiso.deleteMany({ where: { empresaId } });
    await prisma.legajo.deleteMany({ where: { empresaId } });
    await prisma.membership.deleteMany({ where: { businessId: empresaId } });
    await prisma.user.deleteMany({
      where: { id: { in: [A?.user, B?.user].filter(Boolean) as string[] } },
    });
    await prisma.autorizacion.deleteMany({ where: { empresaId } });
    await prisma.cliente.deleteMany({ where: { empresaId } });
    await prisma.usuario.deleteMany({ where: { empresaId } });
    await prisma.empresa.deleteMany({ where: { id: empresaId } });
    if (roleTemplateId) await prisma.roleTemplate.delete({ where: { id: roleTemplateId } });
    if (capabilityDefId) {
      await prisma.capabilityDefinition.delete({ where: { id: capabilityDefId } });
    }
    if (permisoId) await prisma.permiso.delete({ where: { id: permisoId } });
    await prisma.$disconnect();
  });

  it('every foreign key of the module carries the business, except the audit actor (D8)', async () => {
    type Fk = {
      name: string;
      on_delete: string;
      on_update: string;
      columns: string[];
      referenced_columns: string[];
    };
    const fks = await prisma.$queryRaw<Fk[]>`
      SELECT c.conname::text AS name, c.confdeltype::text AS on_delete, c.confupdtype::text AS on_update,
             ARRAY(SELECT a.attname::text FROM unnest(c.conkey) WITH ORDINALITY AS k(n, i)
                   JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.n ORDER BY k.i) AS columns,
             ARRAY(SELECT a.attname::text FROM unnest(c.confkey) WITH ORDINALITY AS k(n, i)
                   JOIN pg_attribute a ON a.attrelid = c.confrelid AND a.attnum = k.n ORDER BY k.i)
               AS referenced_columns
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_class r ON r.oid = c.confrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace AND n.nspname = 'public'
      WHERE c.contype = 'f' AND t.relname::text = ANY(${MODULE_TABLES})
        AND r.relname::text <> ALL(${GLOBAL_TARGETS})
      ORDER BY 1`;

    const audit = fks.filter((fk) => fk.name === 'AuditLog_usuarioId_fkey');
    expect(audit.map((fk) => fk.columns)).toEqual([['usuarioId']]);

    const composite = fks.filter((fk) => fk.name !== 'AuditLog_usuarioId_fkey');
    expect(composite).toHaveLength(27);
    const wrong = composite
      .filter((fk) => {
        const own = fk.columns.includes('businessId') ? 'businessId' : 'empresaId';
        const at = fk.columns.indexOf(own);
        const carries = at >= 0 && ['businessId', 'empresaId'].includes(fk.referenced_columns[at]);
        const onDelete = CASCADE.includes(fk.name) ? 'c' : 'r';
        return !carries || fk.on_delete !== onDelete || fk.on_update !== 'r';
      })
      .map((fk) => fk.name);
    expect(wrong).toEqual([]);
  });

  it("the database refuses another business's user, customer or authorization, even for the system role", async () => {
    expect(
      await rejection(
        prisma.usuarioPermiso.create({
          data: { empresaId: A.id, usuarioId: B.usuario, permisoId },
        }),
      ),
    ).toBe('P2003');
    expect(
      await rejection(prisma.legajo.create({ data: { empresaId: A.id, usuarioId: B.usuario } })),
    ).toBe('P2003');
    expect(
      await rejection(
        prisma.invitacion.create({
          data: {
            empresaId: A.id,
            email: `p18-9-invite-${suffix}@example.test`,
            rol: 'VENDEDOR',
            token: `p18-9-${suffix}`,
            invitadoPorId: B.usuario,
            expiraEn: new Date(Date.now() + 86_400_000),
          },
        }),
      ),
    ).toBe('P2003');
    expect(
      await rejection(
        prisma.phoneNumber.create({
          data: {
            empresaId: A.id,
            phoneNumber: `+54911${suffix % 100_000_000}`,
            clienteId: B.customer,
          },
        }),
      ),
    ).toBe('P2003');
    expect(
      await rejection(
        prisma.notificationPreference.create({ data: { empresaId: A.id, usuarioId: B.usuario } }),
      ),
    ).toBe('P2003');
    expect(
      await rejection(
        prisma.auditLog.create({
          data: {
            empresaId: A.id,
            accion: 'P18_9',
            entidadAfectada: 'Autorizacion',
            autorizacionId: B.authorization,
          },
        }),
      ),
    ).toBe('P2003');
    expect(
      await rejection(
        prisma.roleGrant.create({
          data: { businessId: A.id, membershipId: B.membership, roleTemplateId },
        }),
      ),
    ).toBe('P2003');
  });

  it("the audit log accepts another business's user as its actor (D8: Wapsell opening a business)", async () => {
    expect(
      await rejection(
        prisma.auditLog.create({
          data: {
            empresaId: A.id,
            usuarioId: B.usuario,
            accion: 'PLATFORM_VIEW',
            entidadAfectada: 'Empresa',
          },
        }),
      ),
    ).toBe('written');
  });

  it('a referenced user cannot be deleted; a membership takes its role grant and capabilities with it', async () => {
    await prisma.usuarioPermiso.create({
      data: { empresaId: A.id, usuarioId: A.usuario, permisoId },
    });
    expect(await rejection(prisma.usuario.delete({ where: { id: A.usuario } }))).toBe('P2003');

    const grant = await prisma.roleGrant.create({
      data: { businessId: B.id, membershipId: B.membership, roleTemplateId },
    });
    await prisma.capabilityGrant.create({
      data: { businessId: B.id, roleGrantId: grant.id, capabilityDefId },
    });
    expect(
      await rejection(
        prisma.roleGrant.update({ where: { id: grant.id }, data: { businessId: A.id } }),
      ),
    ).toBe('P2003');
    await prisma.membership.delete({ where: { id: B.membership } });
    expect(await prisma.roleGrant.count({ where: { id: grant.id } })).toBe(0);
    expect(await prisma.capabilityGrant.count({ where: { roleGrantId: grant.id } })).toBe(0);
  });
});
