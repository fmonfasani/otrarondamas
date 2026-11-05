import { jest } from '@jest/globals';

// Jest does not inject the `jest` object into ESM test modules.
// Preserve the existing test suite contract without rewriting every spec.
Object.assign(globalThis, { jest });
