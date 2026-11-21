import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const html=readFileSync(join(root,'index.html'),'utf8');
for(const id of ['top','about','archive','join','contact','gallery','lightbox','auth-dialog','upload-dialog','account-dialog','report-dialog']){
 test(`expected page section #${id} exists`,()=>assert.match(html,new RegExp(`id="${id}"`)));
}
test('reference image is not in public assets',()=>assert.equal(existsSync(join(root,'public','assets','images','wallhaven-jel1jq.jpg')),false));
test('reference image exists only outside public directory',()=>assert.equal(existsSync(join(root,'reference','wallhaven-jel1jq.jpg')),true));
test('server secret does not use frontend VITE_ prefix',()=>assert.match(readFileSync(join(root,'.env.example'),'utf8'),/^SUPABASE_SERVICE_ROLE_KEY=/m));
