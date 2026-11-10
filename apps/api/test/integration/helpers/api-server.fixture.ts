import { spawn, type ChildProcess, type StdioOptions } from 'child_process';

/**
 * Start the compiled API exactly like start:prod. The ESM loader is required:
 * the build emits extensionless relative imports, and without it the child
 * exits silently and suites only see "port not responding".
 */
export function spawnApi(env: NodeJS.ProcessEnv, stdio: StdioOptions = 'ignore'): ChildProcess {
  return spawn(process.execPath, ['--loader', './esm-loader.mjs', 'dist/src/main.js'], {
    cwd: process.cwd(),
    env: { ...process.env, ...env },
    stdio,
  });
}
