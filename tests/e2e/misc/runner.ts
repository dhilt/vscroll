import { Page } from '@playwright/test';
import { Config } from './types';

export const runScroller = async (page: Page, config: Config = {}) =>
  await page.evaluate(config => {
    const { datasourceSettings, datasourceDevSettings, templateSettings } = config as Config;
    const { Scroller, datasource } = window['__vscroll__'];
    datasource.settings = { ...datasource.settings, ...datasourceSettings };
    datasource.devSettings = { ...datasource.devSettings, ...datasourceDevSettings };

    const viewport = window.document.querySelector('.viewport') as HTMLElement;
    if (templateSettings?.viewportWidth) {
      viewport.style.width = templateSettings.viewportWidth + 'px';
    }
    if (templateSettings?.viewportHeight) {
      viewport.style.height = templateSettings.viewportHeight + 'px';
    }
    if (templateSettings?.horizontal) {
      viewport.className += ' horizontal';
    }
    let styles = '';
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

    const { workflow } = new Scroller(datasource);
    window['__vscroll__'].workflow = workflow;
  }, config as unknown);