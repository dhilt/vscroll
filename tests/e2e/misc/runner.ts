import test, { Page } from '@playwright/test';
import { Config, It } from './types';

const URL = '127.0.0.1:3000';

const makeTemplate = (page: Page, config: Config) =>
  page.evaluate(templateSettings => {
    const viewport = window.document.querySelector('.viewport') as HTMLElement;
    let styles = '';
    if (templateSettings?.viewportWidth) {
      styles += `
.viewport { 
  width: ${templateSettings.viewportWidth}px;
}`;
    }
    if (templateSettings?.viewportHeight) {
      styles += `
.viewport { 
  height: ${templateSettings.viewportHeight}px;
}`;
    }
    if (templateSettings?.itemWidth) {
      styles += `
.viewport .item { 
  width: ${templateSettings.itemWidth}px;
}`;
    }
    if (templateSettings?.itemHeight) {
      styles += `
.viewport .item { 
  height: ${templateSettings.itemHeight}px;
}`;
    }
    if (styles) {
      const styleSheet = document.createElement('style');
      styleSheet.innerText = styles;
      document.head.appendChild(styleSheet);
    }
    if (templateSettings?.horizontal) {
      viewport.className += ' horizontal';
    }
  }, config.templateSettings);

const makeDatasource = (page: Page, config: Config) =>
  page.evaluate(config => {
    const { datasourceSettings, datasourceDevSettings } = config as Config;
    const { makeDatasource } = window['VScroll'];

    const Datasource = makeDatasource();
    const datasource = new Datasource({
      get: (index, count, success) => {
        const data = [];
        for (let i = index; i <= index + count - 1; i++) {
          data.push({ id: i, text: 'item #' + i });
        }
        success(data);
      },
      settings: { ...(datasourceSettings || {}) },
      devSettings: { ...(datasourceDevSettings || {}) }
    });

    window.__vscroll__.datasource = datasource;
  }, config as unknown);

export const runScroller = async (page: Page, config: Config = {}) => {
  await makeTemplate(page, config);
  await makeDatasource(page, config);
  await page.evaluate(() => {
    const { Scroller, datasource } = window['__vscroll__'];
    const { workflow } = new Scroller(datasource);
    window['__vscroll__'].workflow = workflow;
  });
};

export const makeTest = (
  { title, config, it }: { title: string; config: Config; it: It }
) =>
  test(title, async ({ page }) => {
    await page.goto(URL + '/need-run');
    await runScroller(page, config);
    await it({ config, page });
    // await new Promise(r => setTimeout(r, 2000));
  });
