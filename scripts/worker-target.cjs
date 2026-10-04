const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
function treeHash(root='.open-next'){
 const hash=crypto.createHash('sha256');
 function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const file=path.join(dir,entry.name),relative=path.relative(root,file).replaceAll('\\','/');if(relative==='staging-build.json')continue;if(entry.isDirectory())walk(file);else if(entry.isFile()){hash.update(relative);hash.update(fs.readFileSync(file));}else throw Error('Build artifacts must not contain links');}}
 walk(root);return hash.digest('hex');
}
function productionTarget(root='.open-next'){if(fs.existsSync(path.join(root,'staging-build.json')))throw Error('Staging artifacts cannot deploy to production. Rebuild production first.');}
if(require.main===module){try{productionTarget();console.log('Production build target verified');}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={treeHash,productionTarget};
