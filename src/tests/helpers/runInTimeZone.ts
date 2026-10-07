import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import ts from 'typescript';

import { PROMPT_RETENTION_DAYS } from '@/constants/limits';

/**
 * Jest sandboxes `process.env`, so setting `process.env.TZ` inside a test does not change the
 * zone Date uses. To exercise real DST rules from any host TZ (and without touching the
 * `test:tz` script or Jest config), this compiles the real `src/utils/dates.ts` to CommonJS and
 * evaluates `body` against its exports in a child Node process started with `TZ=<zone>`.
 *
 * `body` is the source of a function body that receives `D` (the dates module) and returns a
 * JSON-serialisable value. It is a string (not a function) so Babel/coverage instrumentation
 * of the test file cannot leak into the child.
 */
const DATES_SOURCE = readFileSync(path.join(process.cwd(), 'src/utils/dates.ts'), 'utf8');
const DATES_JS = ts.transpileModule(DATES_SOURCE, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

export function runInTimeZone<T>(timeZone: string, body: string): T {
  const script = `
    const module = { exports: {} };
    const require = (id) => {
      if (id === '@/constants/limits') return { PROMPT_RETENTION_DAYS: ${PROMPT_RETENTION_DAYS} };
      throw new Error('unexpected require ' + id);
    };
    (function (module, exports, require) { ${DATES_JS}\n })(module, module.exports, require);
    const result = (function (D) { ${body}\n })(module.exports);
    process.stdout.write(JSON.stringify(result));
  `;
  const stdout = execFileSync(process.execPath, ['-e', script], {
    env: { TZ: timeZone, PATH: process.env.PATH ?? '' },
    encoding: 'utf8',
  });
  return JSON.parse(stdout) as T;
}
