const tsJest = require('ts-jest').default;
const delegate = tsJest.createTransformer({
  useESM: true,
  diagnostics: {
    exclude: ['**/*.spec.ts', '**/*.integration-spec.ts', '**/*.e2e-spec.ts'],
  },
});

const testFile = /(?:\.spec|\.integration-spec|\.e2e-spec)\.ts$/;
const jestImport = /import\s*\{[^}]*\bjest\b[^}]*\}\s*from\s*['"]@jest\/globals['"]/s;

module.exports = {
  process(sourceText, sourcePath, transformOptions) {
    const source =
      testFile.test(sourcePath) && !jestImport.test(sourceText)
        ? \`import { jest } from '@jest/globals';\n\${sourceText}\`
        : sourceText;

    return delegate.process(source, sourcePath, transformOptions);
  },

  getCacheKey(sourceText, sourcePath, transformOptions) {
    return delegate.getCacheKey(sourceText, sourcePath, transformOptions);
  },
};
