/**
 * Node ESM resolver for the API's existing extensionless TypeScript imports.
 * TypeScript emits these imports unchanged; this loader resolves them to the
 * corresponding JavaScript files in dist without rewriting application code.
 */
import { extname } from 'node:path';

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('.') && !extname(specifier)) {
    try {
      return await nextResolve(`${specifier}.js`, context);
    } catch (error) {
      if (error?.code !== 'ERR_MODULE_NOT_FOUND' && error?.code !== 'ERR_UNSUPPORTED_DIR_IMPORT') {
        throw error;
      }
    }

    try {
      return await nextResolve(`${specifier}/index.js`, context);
    } catch (error) {
      if (error?.code !== 'ERR_MODULE_NOT_FOUND' && error?.code !== 'ERR_UNSUPPORTED_DIR_IMPORT') {
        throw error;
      }
    }
  }

  return nextResolve(specifier, context);
}
