#!/bin/bash
# Run tests inside the Docker container with correct DB credentials

cd /app/apps/api

export DATABASE_URL="postgresql://test_user:test_password@localhost:5432/otrarondamas_test?schema=public"
export JWT_SECRET="test-jwt-secret-key"

# Run P6 cart tests
echo "=== Running P6 Cart Tests ==="
npx jest --config test/jest-e2e.json p6-cart --verbose

# Capture exit code
TEST_EXIT=$?

# Summary
echo ""
echo "=== Test Summary ==="
if [ $TEST_EXIT -eq 0 ]; then
  echo "✅ All tests passed"
else
  echo "❌ Some tests failed (exit code: $TEST_EXIT)"
fi

exit $TEST_EXIT
