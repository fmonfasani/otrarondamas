/**
 * Node ESM resolver for the API's existing extensionless TypeScript imports.
 * TypeScript emits these imports unchanged; this loader resolves them to the
 * corresponding JavaScript files in dist without rewriting application code.
 */

export async function resolve(specifier, context, nextResolve) {
  // path.extname() treats names such as "./app.module" as having an extension
  // (".module"), even though the emitted file is "app.module.js".
  const hasRuntimeExtension = /\.(?:[cm]?js|json|node)$/i.test(specifier);

  if (specifier.startsWith('.') && !hasRuntimeExtension) {
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
