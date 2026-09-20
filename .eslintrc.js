module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
    tsconfigRootDir: __dirname,
    project: ['./tsconfig.base.json', './apps/*/tsconfig.json', './packages/*/tsconfig.json'],
  },
  plugins: [
    '@typescript-eslint',
    'prettier',
    'react',
    'react-hooks',
  ],
  rules: {
    'indent': ['error', 2],
    'linebreak-style': ['error', 'windows'],
    'prettier/prettier': ['error', { endOfLine: 'crlf' }],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  overrides: [
    {
      files: ['*.js'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
    {
      files: ['*.ts', '*.tsx'], // Apply React rules to both .ts and .tsx files
      rules: {
        'react/react-in-jsx-scope': 'off', // React 17+ doesn't require React to be in scope
      },
    },
  ],
};
