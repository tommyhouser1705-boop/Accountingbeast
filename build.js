const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
function inline(file) {
  return fs.readFileSync(path.join(root, file), 'utf8')
    .replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, name) => {
      const css = fs.readFileSync(path.join(root, name), 'utf8').replace(/@import[^;]+;/g, '');
      return '<style>' + css.replace(/[ \t]+$/gm, '') + '</style>';
    })
    .replace(/<script src="([^"]+)"><\/script>/g, (_, name) =>
      '<script>' + fs.readFileSync(path.join(root, name), 'utf8').replace(/<\/script/gi, '<\\/script') + '</script>');
}
fs.mkdirSync(path.join(root, 'docs'), {recursive:true});
for (const file of ['index.html', 'capstone.html']) fs.writeFileSync(path.join(root, 'docs', file), inline(file));
fs.writeFileSync(path.join(root, 'docs', '.nojekyll'), '');
console.log('Built classroom and comprehensive simulation in docs/');
// Keep server accounting identical to the tested browser engine.
fs.copyFileSync(path.join(root,'lesson-engine.js'),path.join(root,'supabase/functions/classroom/lesson-engine.js'));
const service=fs.readFileSync(path.join(root,'supabase/functions/classroom/service.mjs'),'utf8');
const handler=fs.readFileSync(path.join(root,'supabase/functions/classroom/index.ts'),'utf8')
  .replace("import './lesson-engine.js';",'')
  .replace("import { handleAction } from './service.mjs';",'')
 .replace("import {generateCourseAssignment} from './generator.mjs';",'');
// Preserve JavaScript module semantics in the single-file TypeScript editor
// entry point. The typed request handler is still checked as TypeScript.
const embedded="import 'data:text/javascript;base64,"+Buffer.from(fs.readFileSync(path.join(root,'lesson-engine.js'),'utf8')).toString('base64')+"';\n"
  +"import {generateCourseAssignment} from 'data:text/javascript;base64,"+Buffer.from(fs.readFileSync(path.join(root,'supabase/functions/classroom/generator.mjs'),'utf8')).toString('base64')+"';\n"
 +"import {handleAction} from 'data:text/javascript;base64,"+Buffer.from(service).toString('base64')+"';\n";
fs.writeFileSync(path.join(root,'docs/classroom-function.ts'),embedded+handler);
fs.copyFileSync(path.join(root,'supabase/migrations/202610080001_classroom.sql'),path.join(root,'docs/database.sql'));
fs.copyFileSync(path.join(root,'account-setup.html'),path.join(root,'docs/account-setup.html'));
fs.copyFileSync(path.join(root,'cloud-config.js'),path.join(root,'docs/cloud-config.js'));

// Ship document readers locally so professor uploads need no third-party endpoint.
for(const dir of ['assets','docs/assets']){fs.mkdirSync(path.join(root,dir),{recursive:true});for(const [source,target] of [['pdfjs-dist/build/pdf.mjs','pdf.mjs'],['pdfjs-dist/build/pdf.worker.mjs','pdf.worker.mjs'],['mammoth/mammoth.browser.min.js','mammoth.browser.min.js']])fs.copyFileSync(path.join(root,'node_modules',source),path.join(root,dir,target));}

for(const dir of ['assets','docs/assets'])for(const packageName of ['pdfjs-dist','mammoth'])fs.copyFileSync(path.join(root,'node_modules',packageName,'LICENSE'),path.join(root,dir,packageName+'-LICENSE.txt'));
