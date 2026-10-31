#!/usr/bin/env ts-node
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
/**
 * Generate relation isolation test files
 *
 * Usage:
 *   npm run generate:relation-tests
 *
 * Output:
 *   - Generates test files to apps/api/test/integration/relations/
 *   - One file per relation from RELATIONS_WITH_OWNERSHIP
 *   - Pattern: {SourceModel}-{TargetModel}.spec.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../src/prisma/prisma.service';
import { RELATIONS_WITH_OWNERSHIP } from '../../src/prisma/relation-ownership';
import { RelationTestGenerator } from './relation-test-generator';

const RELATIONS_OUTPUT_DIR = path.resolve(__dirname, '../../test/integration/relations');

const THRESHOLD_PCT = 75;

interface RelationInfo {
  sourceModel: string;
  relationField: string;
  targetModel: string;
  fkField: string;
}

/**
 * Ensure output directory exists
 */
function ensureOutputDir(): void {
  if (!fs.existsSync(RELATIONS_OUTPUT_DIR)) {
    fs.mkdirSync(RELATIONS_OUTPUT_DIR, { recursive: true });
    console.log(`[+] Created output directory: ${RELATIONS_OUTPUT_DIR}`);
  }
}

/**
 * Generate unique filename for a relation pair
 */
function getOutputFilename(relation: RelationInfo): string {
  return `${relation.sourceModel}-${relation.targetModel}.spec.ts`;
}

/**
 * Generate test files for all relations in registry
 */
async function generateAllTests(): Promise<void> {
  // Initialize Prisma to access DMMF
  const prisma = new PrismaService();

  // Get DMMF from Prisma client
  const dmmf = Prisma.dmmf;

  // Create generator
  const generator = new RelationTestGenerator(dmmf, null, RELATIONS_WITH_OWNERSHIP);

  // Get all relations
  const allRelations = generator.getAllRelations();

  console.log(`\n[*] Processing ${allRelations.length} relations from registry...`);
  console.log(`[*] Output directory: ${RELATIONS_OUTPUT_DIR}`);
  console.log(`[*] Threshold: ${THRESHOLD_PCT}%\n`);

  ensureOutputDir();

  let generated = 0;
  let skipped = 0;
  const generatedFiles: string[] = [];

  for (const relation of allRelations) {
    try {
      const filename = getOutputFilename(relation);
      const filepath = path.join(RELATIONS_OUTPUT_DIR, filename);

      // Generate test content
      const testContent = generator.generateTestFile(relation);

      // Write to file
      fs.writeFileSync(filepath, testContent, 'utf-8');

      generated++;
      generatedFiles.push(filename);

      console.log(
        `[✓] ${relation.sourceModel} → ${relation.targetModel} (${relation.relationField})`,
      );
    } catch (error) {
      skipped++;
      console.error(
        `[!] Failed to generate test for ${relation.sourceModel}.${relation.relationField}: ${error}`,
      );
    }
  }

  // Calculate coverage
  const totalInRegistry = Object.keys(RELATIONS_WITH_OWNERSHIP).reduce(
    (sum, model) => sum + (RELATIONS_WITH_OWNERSHIP[model]?.length ?? 0),
    0,
  );

  const coveragePct = Math.round((generated / (totalInRegistry || 1)) * 100);
  const meetsThreshold = coveragePct >= THRESHOLD_PCT;

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Generated test files for ${generated} relations`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Coverage: ${coveragePct}% (threshold: ${THRESHOLD_PCT}%)`);
  console.log(`Meets threshold: ${meetsThreshold ? '✓ YES' : '✗ NO'}`);
  console.log(`${'='.repeat(60)}\n`);

  if (!meetsThreshold) {
    process.exit(1);
  }

  // Save manifest of generated files
  const manifest = {
    timestamp: new Date().toISOString(),
    version: '1.0',
    threshold: THRESHOLD_PCT,
    generatedCount: generated,
    skippedCount: skipped,
    coveragePercent: coveragePct,
    files: generatedFiles.sort(),
  };

  const manifestPath = path.join(RELATIONS_OUTPUT_DIR, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

  console.log(`[+] Manifest saved: ${manifestPath}`);
  console.log(`[+] Generated tests available in: ${RELATIONS_OUTPUT_DIR}`);
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║        Relation Test Generator v1.0                        ║');
    console.log('║   Generating isolation tests from RELATIONS_WITH_OWNERSHIP   ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    await generateAllTests();
  } catch (error) {
    console.error('[ERROR]', error);
    process.exit(1);
  }
}

main();
