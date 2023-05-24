const path = require('path');
const express = require('express');
const { readFile } = require('fs');

const app = express();
const PORT = 3000;
let demoHtml;

const init = () => new Promise((resolve, reject) =>
  readFile(path.join(__dirname, '/static/demo.html'), { encoding: 'utf8' }, (e, i) => {
    if (e) {
      reject(e);
    }
    demoHtml = i;
    resolve();
  })
);

app.use(express.static(path.join(__dirname, './static')));

app.get('/vscroll.js', (_, res) => {
  res.sendFile(path.join(__dirname, '../dist/bundles/vscroll.umd.js'));
});
app.get('/vscroll.umd.js.map', (_, res) => {
  res.sendFile(path.join(__dirname, '../dist/bundles/vscroll.umd.js.map'));
});

app.get('/*', (req, res) => {
  console.log(req.originalUrl);
  if (req.originalUrl === '/index2') {
    return res.sendFile(path.join(__dirname, '/static/index2.html'));
  }
  const html = demoHtml.replace('<!-- datasource -->', '<script src="./datasource.js"></script>');
  return res.send(html);
});

init().then(
  app.listen(PORT, () => console.log(`Server listening on port: ${PORT}`))
).catch(e => console.log('Can\'t run server', e));
