import {readFile,readdir,stat} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
const root=resolve(import.meta.dirname,'..'),dist=resolve(root,'dist');
const files=await readdir(dist,{recursive:true});
let count=0;
for(const file of files){const path=resolve(dist,file);if(!(await stat(path)).isFile())continue;count++;
 if(file.endsWith('.js')){
  execFileSync(process.execPath,['--check',path],{stdio:'pipe'});
  if(!file.startsWith('lib/')){const source=await readFile(path,'utf8');for(const m of source.matchAll(/(?:from\s*|import\s*)['"](\.\.?\/[^'"]+)['"]/g))await stat(resolve(dirname(path),m[1]));}
 }
}
const html=await readFile(resolve(dist,'index.html'),'utf8'),ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
if(new Set(ids).size!==ids.length)throw new Error('Duplicate HTML IDs');
for(const m of html.matchAll(/(?:src|href)="(\.\/[^"#]+)"/g))await stat(resolve(dist,m[1]));
const main=await readFile(resolve(dist,'main.js'),'utf8');for(const m of main.matchAll(/\$\('([^']+)'\)/g))if(!ids.includes(m[1]))throw new Error(`Missing DOM target: ${m[1]}`);
const manifest=JSON.parse(await readFile(resolve(root,'.openai/hosting.json'),'utf8'));if(manifest.static.directory!=='dist')throw new Error('Incorrect static directory');
if(/https?:\/\//.test((await readFile(resolve(dist,'style.css'),'utf8'))))throw new Error('External stylesheet request');
console.log(`Validated ${count} public files: JavaScript syntax, module imports, HTML links, DOM targets, and static entrypoint.`);
