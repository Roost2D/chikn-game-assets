import { cp, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
const docs=resolve('docs/.vitepress/dist');await mkdir(resolve(docs,'showcase'),{recursive:true});await cp(resolve('apps/showcase/dist'),resolve(docs,'showcase'),{recursive:true});
