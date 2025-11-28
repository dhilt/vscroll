export default {
  '*.ts': () => 'npm run lint',
  '*.{ts,js,json}': 'prettier --write'
};
