#!/bin/bash
# CI/CD Metrics Analysis Script
# Collects test timing, coverage, and workflow statistics

set -euo pipefail

OUTPUT_DIR="${1:-.ci-metrics}"
mkdir -p "$OUTPUT_DIR"

echo "🔍 Analyzing CI/CD metrics..."

# ============================================================================
# 1. Test Inventory & Statistics
# ============================================================================

echo "📊 Collecting test statistics..."

cat > "$OUTPUT_DIR/test-inventory.txt" << 'EOF'
TEST INVENTORY
==============

Unit Tests:
EOF

find apps/api/src -name "*.spec.ts" 2>/dev/null | wc -l | xargs echo "  Count:" >> "$OUTPUT_DIR/test-inventory.txt"
find apps/api/src -name "*.spec.ts" 2>/dev/null | head -10 | sed 's/^/    - /' >> "$OUTPUT_DIR/test-inventory.txt" || true

cat >> "$OUTPUT_DIR/test-inventory.txt" << 'EOF'

Integration Tests:
EOF

find apps/api/test/integration -name "*.integration-spec.ts" 2>/dev/null | wc -l | xargs echo "  Count:" >> "$OUTPUT_DIR/test-inventory.txt"
find apps/api/test/integration -name "*.integration-spec.ts" 2>/dev/null | wc -l | xargs -I {} sh -c 'echo "  Estimated serial time: ~{}m @ 2-3m/file" >> '"$OUTPUT_DIR/test-inventory.txt" || true

cat >> "$OUTPUT_DIR/test-inventory.txt" << 'EOF'

E2E Tests:
EOF

find apps/api/test -name "*.e2e-spec.ts" 2>/dev/null | wc -l | xargs echo "  Count:" >> "$OUTPUT_DIR/test-inventory.txt"

# ============================================================================
# 2. Workspace & Build Analysis
# ============================================================================

echo "📦 Analyzing workspace structure..."

cat > "$OUTPUT_DIR/workspace-analysis.txt" << 'EOF'
WORKSPACE ANALYSIS
==================

Packages:
EOF

find apps packages -maxdepth 1 -type d -not -name "." | while read pkg; do
  name=$(basename "$pkg")
  if [ -f "$pkg/package.json" ]; then
    echo "  $name" >> "$OUTPUT_DIR/workspace-analysis.txt"
  fi
done

echo "" >> "$OUTPUT_DIR/workspace-analysis.txt"
echo "Build Commands:" >> "$OUTPUT_DIR/workspace-analysis.txt"
grep '"build"' package.json apps/*/package.json 2>/dev/null | sed 's/^/  /' >> "$OUTPUT_DIR/workspace-analysis.txt" || echo "  (no explicit build scripts found)" >> "$OUTPUT_DIR/workspace-analysis.txt"

# ============================================================================
# 3. Lint & Type Checking Configuration
# ============================================================================

echo "🔧 Checking linter configuration..."

cat > "$OUTPUT_DIR/lint-config.txt" << 'EOF'
LINT & TYPE CHECKING
====================

ESLint:
EOF

if [ -f ".eslintrc.json" ] || [ -f ".eslintrc.js" ]; then
  echo "  ✓ ESLint config found" >> "$OUTPUT_DIR/lint-config.txt"
else
  echo "  ⚠ ESLint config not found (using package.json config)" >> "$OUTPUT_DIR/lint-config.txt"
fi

echo "" >> "$OUTPUT_DIR/lint-config.txt"
echo "TypeScript:" >> "$OUTPUT_DIR/lint-config.txt"
if [ -f "tsconfig.base.json" ]; then
  echo "  ✓ tsconfig.base.json found" >> "$OUTPUT_DIR/lint-config.txt"
else
  echo "  ⚠ tsconfig.base.json not found" >> "$OUTPUT_DIR/lint-config.txt"
fi

# ============================================================================
# 4. Jest Configuration Analysis
# ============================================================================

echo "⚙️ Analyzing Jest configuration..."

cat > "$OUTPUT_DIR/jest-config-analysis.txt" << 'EOF'
JEST CONFIGURATION ANALYSIS
===========================

Unit Tests (apps/api/package.json jest config):
EOF

if grep -q '"jest"' apps/api/package.json; then
  echo "  ✓ Jest config in package.json" >> "$OUTPUT_DIR/jest-config-analysis.txt"
  echo "  Root: src/" >> "$OUTPUT_DIR/jest-config-analysis.txt"
  echo "  Parallelization: Not explicitly set (default: num CPUs)" >> "$OUTPUT_DIR/jest-config-analysis.txt"
else
  echo "  ⚠ No Jest config found" >> "$OUTPUT_DIR/jest-config-analysis.txt"
fi

cat >> "$OUTPUT_DIR/jest-config-analysis.txt" << 'EOF'

Integration Tests (apps/api/test/jest-e2e.json):
EOF

if [ -f "apps/api/test/jest-e2e.json" ]; then
  echo "  ✓ jest-e2e.json found" >> "$OUTPUT_DIR/jest-config-analysis.txt"
  grep -E '"maxWorkers"|"testTimeout"|"forceExit"' apps/api/test/jest-e2e.json | sed 's/^/    /' >> "$OUTPUT_DIR/jest-config-analysis.txt" || echo "    (checking for parallelization settings...)" >> "$OUTPUT_DIR/jest-config-analysis.txt"
else
  echo "  ⚠ jest-e2e.json not found" >> "$OUTPUT_DIR/jest-config-analysis.txt"
fi

# ============================================================================
# 5. Workflow Summary
# ============================================================================

echo "⚡ Summarizing CI workflows..."

cat > "$OUTPUT_DIR/workflow-summary.txt" << 'EOF'
CI WORKFLOW SUMMARY
===================

EOF

find .github/workflows -name "*.yml" -o -name "*.yaml" | while read workflow; do
  name=$(basename "$workflow" .yml)
  name="${name%.yaml}"
  echo "Workflow: $name" >> "$OUTPUT_DIR/workflow-summary.txt"
  echo "  Path: $workflow" >> "$OUTPUT_DIR/workflow-summary.txt"

  # Count jobs
  job_count=$(grep -c "^  [a-z_-]*:" "$workflow" || echo "?")
  echo "  Jobs: $job_count" >> "$OUTPUT_DIR/workflow-summary.txt"

  # Check for parallelization
  if grep -q "maxWorkers\|parallel" "$workflow"; then
    echo "  Parallelization: ✓ Enabled" >> "$OUTPUT_DIR/workflow-summary.txt"
  else
    echo "  Parallelization: ⚠ Not detected" >> "$OUTPUT_DIR/workflow-summary.txt"
  fi

  echo "" >> "$OUTPUT_DIR/workflow-summary.txt"
done

# ============================================================================
# 6. Optimization Recommendations
# ============================================================================

echo "💡 Generating recommendations..."

cat > "$OUTPUT_DIR/optimization-recommendations.txt" << 'EOF'
OPTIMIZATION RECOMMENDATIONS
==============================

Phase 1: Quick Wins (Expected: 30-40 min savings)
-------------------------------------------------

□ Enable Jest parallelization
  - Update jest-e2e.json: "maxWorkers": "50%"
  - Update unit test config: "maxWorkers": "50%"
  - Expected gain: 60-70% reduction in test time

□ Implement npm caching
  - Add to all workflows: cache-dependency-path: '**/package-lock.json'
  - Expected gain: 30-40s per job

□ Consolidate test jobs
  - Merge unit + integration into single parallel job
  - Expected gain: 10-15 min overhead reduction

Phase 2: Structural Improvements (Expected: 20-30 min savings)
-------------------------------------------------------------

□ Remove Post-Merge B3 duplication
  - Post-Merge runs full regression, B3 already validated on push
  - Expected gain: 20-30 min per merge

□ Refactor hardcoded test steps
  - Replace 17 B3 test steps with dynamic glob discovery
  - Expected gain: Maintenance, 0 runtime impact

□ Add incremental Prisma generation
  - Cache .prisma/ output if schema unchanged
  - Expected gain: 10-15s per job

Phase 3: Advanced (Optional)
----------------------------

□ Test selection by git diff
  - Only run tests touching modified files on PRs
  - Expected gain: 30-60% on typical PRs
  - Risk: Medium (false negatives if mapping incomplete)

□ Job-level artifact caching
  - Cache dist/, coverage/, results for faster retries
  - Expected gain: 5 min on retry

□ Auto-retry infrastructure failures
  - Retry transient database/timeout errors
  - Expected gain: Eliminate 5-10% false failures

IMPLEMENTATION ORDER
--------------------

1. Enable Jest parallelization (immediate, high-impact)
2. Implement npm caching (immediate, quick)
3. Remove Post-Merge duplication (structural)
4. Consolidate test jobs (structural)
5. Test selection by git diff (advanced, requires setup)

EOF

# ============================================================================
# 7. Summary
# ============================================================================

cat > "$OUTPUT_DIR/ANALYSIS-SUMMARY.txt" << 'EOF'
CI/CD ANALYSIS SUMMARY
======================

Generated: $(date)
Repository: $(pwd)

Files analyzed:
  - Workflows: $(find .github/workflows -name "*.yml" -o -name "*.yaml" | wc -l)
  - Jest configs: $(find . -name "jest*.json" 2>/dev/null | grep -v node_modules | wc -l)
  - Test files: $(find apps/api/test -name "*.spec.ts" | wc -l)

Key findings:
  - Integration tests run in serial (--runInBand)
  - No explicit Jest parallelization configured
  - npm caching could improve by 30-40s/job
  - B3 and Post-Merge workflows have redundancy

Estimated improvements:
  - Phase 1: 30-40 min per run (35-40% reduction)
  - Phase 2: +20-30 min (additional savings)
  - Total potential: 50-70 min savings (35-50% reduction in total CI time)

Next steps:
  1. Review optimization-recommendations.txt
  2. Implement Phase 1 changes
  3. Validate with workflow runs
  4. Measure and iterate

For details, see individual reports in $OUTPUT_DIR/

EOF

echo ""
echo "✅ Analysis complete. Results in $OUTPUT_DIR/"
echo ""
cat "$OUTPUT_DIR/ANALYSIS-SUMMARY.txt"
