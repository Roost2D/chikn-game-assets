import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const budgets = JSON.parse(await readFile(resolve('config/budgets.json'), 'utf8'));
const release = JSON.parse(await readFile(resolve('reports/release-size.json'), 'utf8'));
if (release.sourceBytes > budgets.allSourcesBytes) throw new Error(`Source assets exceed ${budgets.allSourcesBytes} byte budget`);
if (release.runtimeBytes > budgets.totalRepositoryBytes) throw new Error(`Runtime output exceeds ${budgets.totalRepositoryBytes} byte budget`);
console.log(`Lifecycle budgets are within limits: ${release.sourceBytes} source bytes, ${release.runtimeBytes} runtime bytes.`);
