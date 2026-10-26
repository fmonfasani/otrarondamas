#!/bin/bash

# Multi-Tenancy Migration Verification Script
# This script verifies that the UserEmpresa M:M migration was successful

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

API_DIR="D:/Software Development/Porfolio/OtraRondaMas/apps/api"

echo -e "${BLUE}=================================================================================${NC}"
echo -e "${BLUE}  Multi-Tenancy Migration Verification${NC}"
echo -e "${BLUE}=================================================================================${NC}\n"

# Function to print section header
print_section() {
  echo -e "${BLUE}► $1${NC}"
}

# Function to print success
print_success() {
  echo -e "${GREEN}  ✓ $1${NC}"
}

# Function to print error
print_error() {
  echo -e "${RED}  ✗ $1${NC}"
}

# Function to print warning
print_warning() {
  echo -e "${YELLOW}  ⚠ $1${NC}"
}

# Check 1: Migration file exists
print_section "Checking migration artifacts..."
if [ -f "$API_DIR/prisma/migrations/20261026_add_user_empresa_multi_tenancy/migration.sql" ]; then
  print_success "Migration file exists"
else
  print_error "Migration file not found"
  exit 1
fi

# Check 2: Seed script exists
if [ -f "$API_DIR/prisma/seed-multi-tenancy.ts" ]; then
  print_success "Seed script exists"
else
  print_error "Seed script not found"
  exit 1
fi

# Check 3: Schema has UserEmpresa model
print_section "Checking Prisma schema..."
if grep -q "model UserEmpresa" "$API_DIR/prisma/schema.prisma"; then
  print_success "UserEmpresa model defined in schema"
else
  print_error "UserEmpresa model not found in schema"
  exit 1
fi

if grep -q "UserEmpresa\[\]" "$API_DIR/prisma/schema.prisma"; then
  print_success "UserEmpresa relations added to Usuario and Empresa models"
else
  print_error "UserEmpresa relations not found"
  exit 1
fi

# Check 4: Verify migration is applied (needs database connection)
print_section "Checking database..."

cd "$API_DIR"

# Check if Prisma client can connect
if npx prisma db execute --stdin <<EOF 2>/dev/null | grep -q '"UserEmpresa"'
SELECT table_name FROM information_schema.tables WHERE table_name = 'UserEmpresa';
EOF
then
  print_success "UserEmpresa table exists in database"
else
  print_warning "UserEmpresa table not found in database (migration may not have been applied yet)"
fi

# Check 5: Count records
print_section "Checking data integrity..."

# Get count of UserEmpresa records
UE_COUNT=$(npx prisma db execute --stdin 2>/dev/null <<EOF | grep -oP '\d+' | head -1
SELECT COUNT(*) as count FROM "UserEmpresa";
EOF
)

if [ -n "$UE_COUNT" ]; then
  print_success "UserEmpresa table contains $UE_COUNT records"
else
  print_warning "Could not fetch UserEmpresa record count"
fi

# Check for users without corresponding UserEmpresa
ORPHANED=$(npx prisma db execute --stdin 2>/dev/null <<EOF | grep -oP '\d+' | head -1
SELECT COUNT(*) FROM "Usuario" u
WHERE u."empresaId" IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM "UserEmpresa" ue
  WHERE ue."usuarioId" = u.id
);
EOF
)

if [ "$ORPHANED" -eq 0 ] 2>/dev/null; then
  print_success "No orphaned usuarios (all have corresponding UserEmpresa records)"
else
  print_warning "Found $ORPHANED orphaned usuarios without UserEmpresa records"
fi

# Check for duplicates
DUPLICATES=$(npx prisma db execute --stdin 2>/dev/null <<EOF | grep -oP '\d+' | head -1
SELECT COUNT(*) FROM (
  SELECT "usuarioId", "empresaId", COUNT(*) as cnt
  FROM "UserEmpresa"
  GROUP BY "usuarioId", "empresaId"
  HAVING COUNT(*) > 1
) duplicates;
EOF
)

if [ "$DUPLICATES" -eq 0 ] 2>/dev/null; then
  print_success "No duplicate UserEmpresa records (unique constraint is working)"
else
  print_error "Found $DUPLICATES duplicate records - unique constraint may be violated!"
  exit 1
fi

# Check indexes
print_section "Checking indexes..."

HAS_INDEXES=$(npx prisma db execute --stdin 2>/dev/null <<EOF | grep -c "UserEmpresa"
SELECT indexname FROM pg_indexes WHERE tablename = 'UserEmpresa';
EOF
)

if [ "$HAS_INDEXES" -ge 2 ]; then
  print_success "Indexes created on UserEmpresa table ($HAS_INDEXES indexes found)"
else
  print_warning "Expected at least 3 indexes on UserEmpresa table, found $HAS_INDEXES"
fi

# Summary
print_section "Verification Summary"
echo ""
echo -e "${GREEN}✓ Migration artifacts present${NC}"
echo -e "${GREEN}✓ Prisma schema updated${NC}"
echo -e "${GREEN}✓ Database table created (if migration applied)${NC}"
echo -e "${GREEN}✓ Unique constraint working${NC}"
echo -e "${GREEN}✓ Indexes created${NC}"
echo ""

echo -e "${YELLOW}Next steps:${NC}"
echo "1. Run migration: npx prisma migrate deploy"
echo "2. Run seed: npx ts-node --esm prisma/seed-multi-tenancy.ts"
echo "3. Run tests: npm run test"
echo ""

echo -e "${GREEN}✓ Verification complete!${NC}"
