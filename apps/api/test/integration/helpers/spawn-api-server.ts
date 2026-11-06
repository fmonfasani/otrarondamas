import { spawn, type ChildProcess, type SpawnOptions } from 'node:child_process';

/** Start the compiled API with the ESM resolver required by extensionless imports. */
export function spawnApiServer(
  environment: NodeJS.ProcessEnv,
  stdio: SpawnOptions['stdio'] = 'ignore',
): ChildProcess {
  return spawn(process.execPath, ['--loader', './esm-loader.mjs', 'dist/src/main.js'], {
    cwd: process.cwd(),
    env: { ...process.env, ...environment },
    stdio,
  });
}
