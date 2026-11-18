import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/**
 * ADR-DAT-019 — PrismaService connects as `wapsell_system`, the database role that is not
 * limited to one business. Only the files in system-client-allowlist.json may import it.
 *
 * - Code that runs inside one business: use CompanyScopedPrismaService.forCompany().
 * - Code that must cross businesses (login, platform, webhooks, jobs): add the file to the
 *   list in the same PR, so the review sees it.
 * - A listed file that no longer uses it must leave the list: the list only shrinks.
 */
const SRC = join(process.cwd(), 'src');
const IMPORT = /import\s+(?:type\s+)?\{[^}]*\bPrismaService\b[^}]*\}\s*from\s*['"]([^'"]+)['"]/g;
const NOT_CHECKED = new Set(['prisma/prisma.service.ts', 'prisma/prisma.module.ts']);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return name.endsWith('.ts') && !/(\.spec|e2e-spec)\.ts$/.test(name) ? [path] : [];
  });
}

function filesUsingSystemClient(): string[] {
  return sourceFiles(SRC)
    .map((path) => relative(SRC, path).split(sep).join('/'))
    .filter((file) => !NOT_CHECKED.has(file))
    .filter((file) =>
      [...readFileSync(join(SRC, file), 'utf8').matchAll(IMPORT)].some(([, from]) =>
        /(^|\/)prisma\.service(\.js)?$/.test(from),
      ),
    )
    .sort((a, b) => a.localeCompare(b));
}

describe('system database client (ADR-DAT-019)', () => {
  const allowed: string[] = JSON.parse(
    readFileSync(join(SRC, 'prisma', 'system-client-allowlist.json'), 'utf8'),
  ).files;
  const used = filesUsingSystemClient();

  it('finds the source tree', () => {
    expect(used.length).toBeGreaterThan(0);
  });

  it('only the listed files use PrismaService (use forCompany() inside one business)', () => {
    expect(used.filter((file) => !allowed.includes(file))).toEqual([]);
  });

  it('every listed file still uses it (remove the ones that stopped)', () => {
    expect(allowed.filter((file) => !used.includes(file))).toEqual([]);
  });
});
