import { VScrollFixture } from './VScrollFixture.js';
import { Page, IDatasource, ITestConfig } from 'types/index.js';

type FixtureParams = {
  page: Page;
  config: ITestConfig;
};

export const createFixture = async ({
  page,
  config
}: FixtureParams): Promise<VScrollFixture> => {
  const { templateSettings, templateFn } = config;

  const datasource: IDatasource = {
    get: config.datasourceGet,
    settings: config.datasourceSettings,
    devSettings: config.datasourceDevSettings
  };

  const fixture = await VScrollFixture.create(page, {
    datasource,
    templateSettings,
    templateFn:
      templateFn ||
      ((item: { $index: number; data: { id: number; text: string } }) =>
        `<div class="item">${item.$index}: ${item.data.text}</div>`),
    noAdapter: config.noAdapter,
    onBefore: config.onBefore
  });

  if (!config.noRelaxOnStart) {
    // Wait for initial workflow cycle to complete
    await fixture.relaxNext(1);
  }

  // // Debug: log actual element dimensions
  // const debugInfo = await page.evaluate(() => {
  //   const viewport = document.getElementById('viewport')!;
  //   const vscroll = document.getElementById('vscroll')!;
  //   const items = Array.from(vscroll.querySelectorAll('[data-sid]'));
  //   const bwdPadding = vscroll.querySelector('[data-padding-backward]') as HTMLElement;
  //   const fwdPadding = vscroll.querySelector('[data-padding-forward]') as HTMLElement;
  //   const horizontal = (window as any).__vscroll__.workflow.scroller.settings.horizontal;
  //   return {
  //     viewportDimensions: {
  //       clientWidth: viewport.clientWidth,
  //       clientHeight: viewport.clientHeight,
  //       scrollWidth: viewport.scrollWidth,
  //       scrollHeight: viewport.scrollHeight
  //     },
  //     vscrollDimensions: {
  //       clientWidth: vscroll.clientWidth,
  //       clientHeight: vscroll.clientHeight,
  //       scrollWidth: vscroll.scrollWidth,
  //       scrollHeight: vscroll.scrollHeight
  //     },
  //     itemCount: items.length,
  //     firstItemDimensions: items[0] ? {
  //       width: (items[0] as HTMLElement).clientWidth,
  //       height: (items[0] as HTMLElement).clientHeight,
  //       display: getComputedStyle(items[0] as HTMLElement).display,
  //       whiteSpace: getComputedStyle(vscroll).whiteSpace
  //     } : null,
  //     bwdPaddingDimensions: {
  //       width: bwdPadding.clientWidth,
  //       height: bwdPadding.clientHeight,
  //       display: getComputedStyle(bwdPadding).display,
  //       computedWidth: getComputedStyle(bwdPadding).width
  //     },
  //     fwdPaddingDimensions: {
  //       width: fwdPadding.clientWidth,
  //       height: fwdPadding.clientHeight,
  //       display: getComputedStyle(fwdPadding).display,
  //       computedWidth: getComputedStyle(fwdPadding).width
  //     },
  //     horizontal
  //   };
  // });
  // console.log('[DEBUG] Initial dimensions:', JSON.stringify(debugInfo, null, 2));

  return fixture;
};
