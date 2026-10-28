import type { Config } from 'jest';

const config: Config = {
  displayName: 'api',
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testRegex: [
    // Unit tests: src/**/*.spec.ts
    'src/.*\\.spec\\.ts$',
  ],
  moduleFileExtensions: ['js', 'json', 'ts'],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
    '^test/(.*)$': '<rootDir>/test/$1',
  },
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'commonjs',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true,
        },
      },
    ],
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.module.ts',
    '!src/**/*.types.ts',
    '!src/**/*.dto.ts',
    '!src/main.ts',
    '!src/**/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'json', 'html'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
  ],
  testTimeout: 30000,
  verbose: true,
  bail: false,
  detectOpenHandles: true,
  forceExit: true,
  // Transform ignore patterns: don't transform node_modules except @nestjs
  transformIgnorePatterns: [
    'node_modules/(?!(@nestjs|socket\\.io-client|kafkajs)/)',
  ],
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  globals: {
    'ts-jest': {
      isolatedModules: true,
    },
  },
};

export default config;
