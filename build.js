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
