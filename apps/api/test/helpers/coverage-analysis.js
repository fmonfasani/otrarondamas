#!/usr/bin/env node

/**
 * Relation Coverage Analysis Script
 *
 * Purpose:
 *   Parse Jest JSON output and measure coverage of relation tests.
 *   Extracts test names matching the pattern "Relación SourceModel→TargetModel"
 *   and compares against the total list of supported relations.
 *
 * Usage:
 *   node apps/api/test/helpers/coverage-analysis.js <jest-results.json>
 *
 * Exit codes:
 *   0 = coverage >= threshold
 *   1 = coverage < threshold
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// Configuration
// ============================================================================

const THRESHOLD_PERCENT = 75;
const TOTAL_RELATIONS = 75;
const REQUIRED_COUNT = Math.ceil((THRESHOLD_PERCENT / 100) * TOTAL_RELATIONS);

// List of all supported relations (75 total, minus allowlist if any)
// These should match the relation tests in test/integration/relations/
const ALL_RELATIONS = [
  // Módulo: Ventas (VENTA)
  'VentaCliente',
  'VentaProducto',
  'VentaUsuario',
  'VentaFormaPago',
  'VentaDescuento',
  'VentaDevolucion',

  // Módulo: Inventario (INV)
  'MovimientoStockProducto',
  'MovimientoStockLote',
  'MovimientoStockCompra',
  'ProductoFamilia',
  'ProductoProveedor',
  'LoteMovimientoStock',

  // Módulo: Compras (COMPRA)
  'CompraProveedor',
  'CompraProducto',
  'CompraUsuario',
  'CompraFormaPago',
  'RecepcionCompraCompra',
  'RecepcionCompraLote',

  // Módulo: Caja (CASH)
  'AperturaCajaUsuario',
  'CierreCajaApertura',
  'CierreCajaMovimientos',
  'MovimientoCajaApertura',
  'ArqueoCajaCierre',

  // Módulo: Productos (PRODUCT)
  'ProductoCategoria',
  'ProductoMarca',
  'ProductoProveedor',
  'ProductoUnitario',
  'ProductoVariante',

  // Módulo: Clientes (CUSTOMER)
  'ClienteContacto',
  'ClienteDocumento',
  'ClienteNivel',
  'ClienteVentaHistoria',
  'ClientePagosHistoria',

  // Módulo: Seguridad (AUTH)
  'UsuarioPermiso',
  'UsuarioRol',
  'UsuarioEmpresa',
  'PermisoCrud',
  'RolPermiso',

  // Módulo: Pedidos (ORDERS)
  'PedidoCliente',
  'PedidoProducto',
  'PedidoEstado',
  'PedidoEnvio',
  'EnvioPedido',

  // Módulo: Devoluciones (RETURNS)
  'DevolucionVenta',
  'DevolucionProducto',
  'DevolucionMotivo',
  'DevolucionProductoHistoria',

  // Módulo: Proveedores (SUPPLIERS)
  'ProveedorContacto',
  'ProveedorCuenta',
  'ProveedorDocumento',
  'ProveedorPagos',

  // Módulo: Reportes (REPORTING)
  'ReporteEmpresa',
  'ReporteParametros',
  'ReporteGenerado',

  // Módulo: Auditoría (AUDIT)
  'AuditLogEmpresa',
  'AuditLogUsuario',
  'AuditLogAutorizacion',
  'AuditLogVenta',

  // Módulo: Notificaciones (NOTIFICATIONS)
  'NotificacionUsuario',
  'NotificacionEmpresa',
  'NotificacionEvento',

  // Módulo: Configuración (CONFIG)
  'ConfiguracionEmpresa',
  'ConfiguracionParametro',
  'ConfiguracionUsuario',

  // Módulo: Webhooks (WEBHOOKS)
  'WebhookEmpresa',
  'WebhookEventoSuscripcion',
  'WebhookEntrega',

  // Módulo: Archivos (FILES)
  'ArchivoEmpresa',
  'ArchivoDueno',
  'ArchivoPermiso',

  // Módulo: Sincronización (SYNC)
  'SincronizacionLog',
  'SincronizacionEntidad',
  'SincronizacionError',

  // Adicionales: Extensiones multitenancy
  'CompanyScopedRelation',
  'AuthorizationBoundary',
  'TenantIsolationVault',
  'PermissionInheritance',
  'RoleHierarchyAncestry',
];

// Allowlist: relaciones que NO requieren test dedicado
const ALLOWLIST = new Set([
  // Relaciones que hereda de test de padre o están cubiertas implícitamente
  'ConfiguracionParametro',
  'NotificacionEvento',
  'WebhookEventoSuscripcion',
  'SincronizacionError',
]);

// ============================================================================
// Main Script
// ============================================================================

function main() {
  const resultsFile = process.argv[2];

  if (!resultsFile) {
    console.error('Usage: node coverage-analysis.js <jest-results.json>');
    process.exit(1);
  }

  if (!fs.existsSync(resultsFile)) {
    console.error(`Error: Results file not found: ${resultsFile}`);
    process.exit(1);
  }

  let jestResults;
  try {
    const fileContent = fs.readFileSync(resultsFile, 'utf8');
    jestResults = JSON.parse(fileContent);
  } catch (e) {
    console.error(`Error parsing Jest results file: ${e.message}`);
    process.exit(1);
  }

  const coveredRelations = extractCoveredRelations(jestResults);
  const report = generateReport(coveredRelations);

  console.log(report.text);

  process.exit(report.exitCode);
}

/**
 * Extract relation names from Jest test results
 * Looks for test names matching pattern: "Relación SourceModel→TargetModel"
 */
function extractCoveredRelations(jestResults) {
  const covered = new Set();

  if (!jestResults.testResults || !Array.isArray(jestResults.testResults)) {
    return covered;
  }

  for (const testFile of jestResults.testResults) {
    if (!testFile.assertionResults || !Array.isArray(testFile.assertionResults)) {
      continue;
    }

    for (const testCase of testFile.assertionResults) {
      // Match patterns like:
      //   "Relación VentaCliente"
      //   "Relación Venta→Cliente"
      //   "Venta→Cliente relation"
      const titleLower = (testCase.title || '').toLowerCase();

      // Pattern 1: "Relación <RelationName>" or "Relación <Model1>→<Model2>"
      const relationMatch = testCase.title?.match(/Relación\s+(\w+(?:→\w+)?)/i);
      if (relationMatch) {
        const relationName = relationMatch[1].replace('→', '');
        if (relationName && testCase.status === 'passed') {
          covered.add(relationName);
        }
        continue;
      }

      // Pattern 2: "<Model1>→<Model2> relation" (reverse order)
      const arrowMatch = testCase.title?.match(/(\w+)→(\w+)\s+relation/i);
      if (arrowMatch) {
        const source = arrowMatch[1];
        const target = arrowMatch[2];
        const relationName = source + target;
        if (testCase.status === 'passed') {
          covered.add(relationName);
        }
        continue;
      }

      // Pattern 3: "covers SourceModel-TargetModel"
      const dashMatch = testCase.title?.match(/covers\s+(\w+)-(\w+)/i);
      if (dashMatch) {
        const source = dashMatch[1];
        const target = dashMatch[2];
        const relationName = source + target;
        if (testCase.status === 'passed') {
          covered.add(relationName);
        }
      }
    }
  }

  return covered;
}

/**
 * Generate coverage report with pass/fail status
 */
function generateReport(coveredRelations) {
  // Filter out allowlisted relations from total count
  const effectiveTotal = ALL_RELATIONS.length - ALLOWLIST.size;
  const effectiveRequired = Math.ceil((THRESHOLD_PERCENT / 100) * effectiveTotal);

  const covered = new Set();
  for (const rel of coveredRelations) {
    if (!ALLOWLIST.has(rel)) {
      covered.add(rel);
    }
  }

  const coveredCount = covered.size;
  const percent = effectiveTotal > 0 ? ((coveredCount / effectiveTotal) * 100).toFixed(1) : 0;
  const passed = coveredCount >= effectiveRequired;

  // Build text report
  let text = '\n';
  text += '╔════════════════════════════════════════════════════════════════╗\n';
  text += '║          Relation Coverage Report                             ║\n';
  text += '╚════════════════════════════════════════════════════════════════╝\n';
  text += '\n';
  text += `Covered:    ${coveredCount.toString().padStart(3)} / ${effectiveTotal} (${percent}%)\n`;
  text += `Threshold:  ${effectiveRequired.toString().padStart(3)} / ${effectiveTotal} (${THRESHOLD_PERCENT.toFixed(1)}%)\n`;
  text += '\n';

  if (passed) {
    text += '✅ Status:     PASSED\n';
  } else {
    text += '❌ Status:     FAILED\n';
    const missing = effectiveRequired - coveredCount;
    text += `             (${missing} more relation(s) needed)\n`;
  }

  text += '\n';
  text += '─────────────────────────────────────────────────────────────────\n';
  text += '\n';
  text += 'Tested Relations:\n';
  text += '\n';

  // List all relations with their coverage status
  for (const rel of ALL_RELATIONS) {
    if (ALLOWLIST.has(rel)) {
      text += `  ⊘ ${rel} (allowlisted)\n`;
    } else if (covered.has(rel)) {
      text += `  ✅ ${rel}\n`;
    } else {
      text += `  ❌ ${rel} (no test found)\n`;
    }
  }

  text += '\n';
  text += '─────────────────────────────────────────────────────────────────\n';
  text += '\n';

  if (!passed) {
    text += `❌ Coverage below threshold. ${effectiveRequired - coveredCount} more relation test(s) required.\n`;
    text += '\n';
    text += 'Missing relations:\n';
    for (const rel of ALL_RELATIONS) {
      if (!ALLOWLIST.has(rel) && !covered.has(rel)) {
        text += `  - ${rel}\n`;
      }
    }
    text += '\n';
  }

  return {
    text,
    exitCode: passed ? 0 : 1,
    coveredCount,
    effectiveTotal,
    passed,
  };
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { extractCoveredRelations, generateReport };
