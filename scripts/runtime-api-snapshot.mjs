import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import ts from 'typescript';

const root = resolve('.');
const packageDirectory = resolve(root, 'packages/runtime');
const manifest = JSON.parse(await readFile(resolve(packageDirectory, 'package.json'), 'utf8'));
const declarationPath = resolve(packageDirectory, manifest.exports['.'].types);
const snapshotPath = resolve(root, 'reports/runtime-public-api.json');
const program = ts.createProgram([declarationPath], {
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  noEmit: true,
  skipLibCheck: true,
  target: ts.ScriptTarget.ESNext,
});
const diagnostics = ts.getPreEmitDiagnostics(program).filter(({ category }) => category === ts.DiagnosticCategory.Error);
if (diagnostics.length) {
  throw new Error(`Could not inspect runtime declarations:\n${ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: (name) => name,
    getCurrentDirectory: () => root,
    getNewLine: () => '\n',
  })}`);
}
const source = program.getSourceFile(declarationPath);
const checker = program.getTypeChecker();
const symbol = source && checker.getSymbolAtLocation(source);
if (!source || !symbol) throw new Error('Could not inspect @chikn-game-assets/runtime declarations');
const declaration = (await readFile(declarationPath, 'utf8')).replace(/\r\n/g, '\n');
const snapshot = {
  schema: 'chikn-game-assets.public-api/v1',
  package: manifest.name,
  exports: manifest.exports,
  symbols: checker.getExportsOfModule(symbol).map(({ escapedName }) => String(escapedName)).sort(),
  declarationSha256: createHash('sha256').update(declaration).digest('hex'),
};
const serialized = `${JSON.stringify(snapshot, null, 2)}\n`;
if (process.argv.includes('--write')) {
  await mkdir(dirname(snapshotPath), { recursive: true });
  await writeFile(snapshotPath, serialized);
  console.log(`Wrote ${snapshotPath}`);
} else {
  const expected = await readFile(snapshotPath, 'utf8').catch((error) => error?.code === 'ENOENT' ? undefined : Promise.reject(error));
  if (expected !== serialized) throw new Error('Runtime API snapshot changed. Review it, then run npm run api:snapshot and commit reports/runtime-public-api.json.');
  console.log('Runtime public API snapshot verified.');
}
