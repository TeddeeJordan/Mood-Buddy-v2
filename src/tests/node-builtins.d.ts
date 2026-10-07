// Minimal types for the Node built-ins used by test helpers (runInTimeZone, config tests). Declared locally,
// like node-sqlite.d.ts, so @types/node globals don't leak into app code.
declare module 'node:child_process' {
  export function execFileSync(
    file: string,
    args: readonly string[],
    options: { env?: Record<string, string>; encoding: 'utf8' },
  ): string;
}
declare module 'node:fs' {
  export function readFileSync(path: string, encoding: 'utf8'): string;
  export function readdirSync(
    path: string,
    options: { withFileTypes: true },
  ): { name: string; isDirectory(): boolean }[];
}
declare module 'node:path' {
  const path: { join(...parts: string[]): string };
  export default path;
}
