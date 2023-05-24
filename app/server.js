const path = require('path');
const express = require('express');
const { readFile } = require('fs');
const CONF = require('./demo.config.json');

const PORT = 3000;
let indexHtml;
let demoHtml;

const app = express();

const init = () => new Promise((resolve, reject) => {
  let resolved = 0;
  const _resolve = () => ++resolved === 2 ? resolve() : void 0;

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

app.get('/*', (req, res) => {
  console.log(req.originalUrl);
  const conf = CONF.find(c => c.route === req.originalUrl);
  if (!conf) {
    return res.sendStatus(404);
  }
  const html = demoHtml
    .replace('<!-- head-title -->', ` ${conf.title.head}`)
    .replace('<!-- body-title -->', ` ${conf.title.body}`)
    .replace('<!-- datasource -->', `<script src="${conf.ds}"></script>`);
  return res.send(html);
});

init().then(
  app.listen(PORT, () => console.log(`Server listening on port: ${PORT}`))
).catch(e => console.log('Can\'t run server', e));