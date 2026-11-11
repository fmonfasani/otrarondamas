import { PrismaClient } from '@prisma/client';
import { readFileSync, writeFileSync } from 'fs';
import {
  applyAsistenteLocalConversion,
  countAsistenteLocal,
  revertAsistenteLocalConversion,
  type RoleConversionManifest,
} from '../src/authorization/role-conversion';

/**
 * OR-B4-027 / AUTH-12 — reversible conversion ASISTENTE_LOCAL → VENDEDOR.
 *
 *   npm run roles:convert-asistente-local                      # dry run: counts only
 *   npm run roles:convert-asistente-local -- --apply <manifest.json>
 *   npm run roles:convert-asistente-local -- --revert <manifest.json>
 *
 * `--apply` writes the manifest (the ids it changed); keep it: `--revert` restores exactly
 * those rows. Running it against a shared or production database is a data change and
 * needs the usual authorization.
 */
async function main() {
  const [mode, manifestPath] = process.argv.slice(2);
  const prisma = new PrismaClient();
  try {
    if (!mode) {
      console.log('Dry run — filas ASISTENTE_LOCAL:', await countAsistenteLocal(prisma));
      return;
    }
    if (!manifestPath) throw new Error(`${mode} requiere la ruta del manifiesto`);
    if (mode === '--apply') {
      const manifest = await applyAsistenteLocalConversion(prisma);
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), { flag: 'wx' });
      console.log('Convertidas:', {
        usuarios: manifest.usuarioIds.length,
        memberships: manifest.membershipIds.length,
        invitaciones: manifest.invitacionIds.length,
        manifest: manifestPath,
      });
    } else if (mode === '--revert') {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as RoleConversionManifest;
      console.log('Revertidas:', await revertAsistenteLocalConversion(prisma, manifest));
    } else {
      throw new Error(`Modo desconocido: ${mode}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
