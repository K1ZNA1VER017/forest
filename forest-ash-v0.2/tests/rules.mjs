// Compile the isolated data module to JS, then validate its rules without a renderer.
import {execFileSync} from 'node:child_process';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
const tmp=mkdtempSync(join(tmpdir(),'forest-rules-'));
try{
 execFileSync('node',['node_modules/typescript/bin/tsc','src/rpg.ts','--target','ES2022','--module','ESNext','--moduleResolution','bundler','--skipLibCheck','--outDir',tmp]);
 const r=await import('data:text/javascript;base64,'+Buffer.from(readFileSync(join(tmp,'rpg.js'))).toString('base64'));
 const s={...r.defaults,level:1,blade:false};assert.equal(r.maxHealth(s),100);assert.equal(r.damage(s),17);s.strength=2;assert.equal(r.damage(s),23);s.vitality=3;assert.equal(r.maxHealth(s),130);s.focus=2;assert.equal(r.spellDamage(s),45);s.weapon='bow';assert.equal(r.damage(s),25);assert.equal(r.recipes.length,5);console.log('PASS RPG rules: health, weapon damage, attributes, spell damage, recipe catalogue');
}finally{rmSync(tmp,{recursive:true,force:true})}
