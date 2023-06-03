import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { readFile, readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
let CONF;
let indexHtml;
let demoHtml;

const app = express();

const init = () => new Promise((resolve, reject) => {
  let resolved = 0;
  const _resolve = () => ++resolved === 2 ? resolve() : void 0;

  try {
    CONF = JSON.parse(
      readFileSync(path.join(__dirname, './demo.config.json'), { encoding: 'utf8' })
    );
  } catch (err) {
    reject(err);
  }

  readFile(path.join(__dirname, '/static/index.html'), { encoding: 'utf8' }, (e, i) => {
    if (e) {
      reject(e);
    }
    let menuHtml = ' ';
    try {
      menuHtml = CONF
        .map(c => `<li><a href="${c.route}">${c.title.body}</a></li>`)
        .join('\n');
      if (menuHtml) {
        menuHtml = `<ul>${menuHtml}</ul>`;
      }
    } catch (e) {
      reject(e);
    }
    indexHtml = i.replace('<!-- menu -->', menuHtml);
    _resolve();
  });
  readFile(path.join(__dirname, '/static/demo.html'), { encoding: 'utf8' }, (e, i) => {
    if (e) {
      reject(e);
    }
    demoHtml = i;
    _resolve();
  });
});

app.get('/vscroll.js', (_, res) =>
  res.sendFile(path.join(__dirname, '../dist/bundles/vscroll.umd.js'))
);
app.get('/vscroll.umd.js.map', (_, res) =>
  res.sendFile(path.join(__dirname, '../dist/bundles/vscroll.umd.js.map'))
);

app.get('/', (_, res) => res.send(indexHtml));

app.use(express.static(path.join(__dirname, './static')));

const templates = new Map();
const TEMPLATE_DEFAULT = './templates/common.html';

app.get('/*', (req, res) => {
  console.log(req.originalUrl);
  const conf = CONF.find(c => c.route === req.originalUrl);
  if (!conf) {
    return res.sendStatus(404);
  }
  let html = demoHtml
    .replace('<!-- head-title -->', ` ${conf.title.head}`)
    .replace('<!-- body-title -->', ` ${conf.title.body}`);
  if (conf.description) {
    html = html.replace('<!-- body-description -->', ` ${conf.description}`);
  }

  let template = templates.get(conf.route);
  if (!template) {
    try {
      const templatePath = path.join(__dirname, './static', conf.template || TEMPLATE_DEFAULT);
      template = readFileSync(templatePath, { encoding: 'utf8' });
      templates.get(conf.route, template);
    } catch (err) {
      console.log(err);
      return res.sendStatus(400);
    }
  }
  html = html.replace('<!-- template -->', ` ${template}`);

  if (conf.ds) {
    let dsScript = `<script src="${conf.ds}"></script>`;
    if (conf.needRun) {
      dsScript += '<script>window.__vscroll__.needRun = true</script>';
    }
    html = html.replace('<!-- datasource -->', dsScript);
  }
  return res.send(html);
});

init().then(
  app.listen(PORT, () => console.log(`Server listening on port: ${PORT}`))
).catch(e => {
  console.log('Can\'t run server!\n');
  console.log(e);
  process.exit();
});
