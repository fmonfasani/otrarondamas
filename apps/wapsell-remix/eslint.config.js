import tseslint from 'typescript-eslint';

export default [
  { ignores: ['build/**', 'node_modules/**', '.cache/**', 'tests/e2e/**'] },
  ...tseslint.configs.recommended,
];
