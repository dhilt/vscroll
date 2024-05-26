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

const runners = new Map();
const RUNNER_DEFAULT = './runners/common.js';

const loadEntity = ({ key, map, file }) => {
  let result = map.get(key);
  if (!result) {
    try {
      const templatePath = path.join(__dirname, './static', file);
      result = readFileSync(templatePath, { encoding: 'utf8' });
      map.get(key, result);
    } catch (err) {
      console.log(err);
      return null;
    }
  }
  return result;
};

const makeHtml = ({ conf }) => {
  let html = demoHtml
    .replace('<!-- head-title -->', ` ${conf.title.head}`)
    .replace('<!-- body-title -->', ` ${conf.title.body}`);
  if (conf.description) {
    html = html.replace('<!-- body-description -->', ` ${conf.description}`);
  }

  const template = loadEntity({
    key: conf.route,
    map: templates,
    file: conf.template || TEMPLATE_DEFAULT
  });
  if (template === null) {
    return null;
  }
  html = html.replace('<!-- template -->', ` ${template}`);

  const runner = loadEntity({
    key: conf.route,
    map: runners,
    file: conf.runner || RUNNER_DEFAULT
  });
  if (runner === null) {
    return null;
  }
  html = html.replace('<!-- runner -->', `<script>${runner}</script>`);

  if (conf.ds) {
    let dsScript = `<script src="${conf.ds}"></script>`;
    if (conf.needRun) {
      dsScript += '<script>window.__vscroll__.needRun = true</script>';
    }
    html = html.replace('<!-- datasource -->', dsScript);
  }
  return html;
};

app.get('/*', (req, res) => {
  console.log(req.originalUrl);
  const conf = CONF.find(c => c.route === req.originalUrl);
  if (!conf) {
    return res.sendStatus(404);
  }
  const html = makeHtml({ conf });
  if (!html) {
    return res.sendStatus(400);
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
