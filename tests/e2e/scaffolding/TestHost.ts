import { Direction, Workflow, makeDatasource } from '../../../src/index';
import type {
  IDatasource,
  IDatasourceConstructed,
  Item
} from '../../../src/interfaces/index';
import { getDatasource, TestDatasource } from './datasources';
import type {
  DatasourceProcessor,
  TemplateSettings,
  TestConfig,
  TestItem
} from '../types';

const Datasource = makeDatasource();

const defaultTemplateSettings: Required<
  Omit<TemplateSettings, 'dynamicSize'>
> & { dynamicSize: string | null } = {
  noViewportClass: false,
  viewportHeight: 120,
  viewportWidth: 200,
  itemHeight: 20,
  itemWidth: null,
  horizontal: false,
  dynamicSize: null,
  viewportPadding: 0,
  headerHeight: 0
};

export class TestHost<Data extends TestItem = TestItem> {
  readonly root: HTMLElement;
  readonly viewportElement: HTMLElement;
  readonly contentElement: HTMLElement;
  readonly datasource: IDatasource<Data>;
  workflow: Workflow<Data>;
  readonly shared: Record<string, unknown> = {};
  readonly padding: Record<Direction, { getSize: () => number }>;

  private readonly settings: TemplateSettings;
  private readonly windowViewport: boolean;
  private readonly setProcessor?: (
    processor: DatasourceProcessor<Data>
  ) => void;
  private renderedItems: Item<Data>[] = [];
  private disposed = false;

  get scroller(): Workflow<Data>['scroller'] {
    return this.workflow.scroller;
  }

  get adapter(): IDatasourceConstructed<Data>['adapter'] {
    return this.scroller.datasource.adapter;
  }

  get innerLoopCount(): number {
    return this.scroller.state.cycle.innerLoop.total;
  }

  get horizontal(): boolean {
    return this.scroller.settings.horizontal;
  }

  constructor(config: TestConfig<unknown, Data>) {
    this.windowViewport = !!config.datasourceSettings?.windowViewport;
    this.settings = {
      ...defaultTemplateSettings,
      ...(config.templateSettings || {})
    } as TemplateSettings;

    const dom = this.createDom();
    this.root = dom.root;
    this.viewportElement = dom.viewport;
    this.contentElement = dom.content;

    const source: IDatasource<Data> =
      config.datasource?.() ??
      (getDatasource() as unknown as IDatasource<Data>);
    this.setProcessor = (
      source as Partial<TestDatasource<Data>>
    ).setProcessor?.bind(source);
    const datasourceParams = {
      ...source,
      get: source.get.bind(source),
      settings: {
        ...(source.settings || {}),
        ...(config.datasourceSettings || {})
      },
      devSettings: {
        ...(source.devSettings || {}),
        ...(config.datasourceDevSettings || {})
      }
    };

    if (source.adapter) {
      source.settings = datasourceParams.settings;
      source.devSettings = datasourceParams.devSettings;
    }
    this.datasource = config.noAdapter
      ? datasourceParams
      : source.adapter
        ? (source as IDatasourceConstructed<Data>)
        : new Datasource<Data>(datasourceParams);

    try {
      this.workflow = this.createWorkflow();
      this.padding = {
        [Direction.forward]: {
          getSize: () => this.scroller.viewport.paddings[Direction.forward].size
        },
        [Direction.backward]: {
          getSize: () =>
            this.scroller.viewport.paddings[Direction.backward].size
        }
      };
    } catch (error) {
      this.root.remove();
      throw error;
    }
  }

  private createWorkflow(): Workflow<Data> {
    return new Workflow<Data>({
      consumer: { name: 'vscroll-browser-tests', version: '1.0.0' },
      element: this.contentElement,
      datasource: this.datasource,
      run: items => this.render(items)
    });
  }

  private resetContent(): void {
    this.renderedItems = [];
    const backwardPadding = document.createElement('div');
    backwardPadding.dataset.paddingBackward = '';
    const forwardPadding = document.createElement('div');
    forwardPadding.dataset.paddingForward = '';
    if (this.settings.horizontal) {
      backwardPadding.style.display = 'inline-block';
      forwardPadding.style.display = 'inline-block';
    }
    this.contentElement.replaceChildren(backwardPadding, forwardPadding);
  }

  private createDom(): {
    root: HTMLElement;
    viewport: HTMLElement;
    content: HTMLElement;
  } {
    const settings = this.settings;
    const root = document.createElement('section');
    root.dataset.vscrollTestRoot = '';
    root.style.cssText =
      'display:block;font:16px/20px sans-serif;margin:0;padding:0;';

    if (settings.headerHeight) {
      const header = document.createElement('div');
      header.dataset.testHeader = '';
      header.style.height = `${settings.headerHeight}px`;
      root.appendChild(header);
    }

    const viewport = document.createElement('div');
    viewport.dataset.testViewport = '';
    viewport.style.boxSizing = 'content-box';
    viewport.style.display = 'block';
    viewport.style.margin = '0';
    viewport.style.padding = `${settings.viewportPadding || 0}px`;

    if (this.windowViewport) {
      viewport.style.width = '100%';
      viewport.style.overflow = 'visible';
    } else if (settings.horizontal) {
      viewport.style.width = `${settings.viewportWidth || 200}px`;
      viewport.style.height = `${settings.viewportHeight || 100}px`;
      viewport.style.overflowX = 'scroll';
      viewport.style.overflowY = 'hidden';
      viewport.style.whiteSpace = 'nowrap';
    } else {
      viewport.style.width = `${settings.viewportWidth || 200}px`;
      viewport.style.height = `${settings.viewportHeight || 120}px`;
      viewport.style.overflowX = 'hidden';
      viewport.style.overflowY = 'auto';
    }

    const content = document.createElement('div');
    content.dataset.testContent = '';
    content.style.margin = '0';
    content.style.padding = '0';
    if (settings.horizontal) {
      content.style.display = 'inline-block';
    }

    const backwardPadding = document.createElement('div');
    backwardPadding.dataset.paddingBackward = '';
    const forwardPadding = document.createElement('div');
    forwardPadding.dataset.paddingForward = '';
    if (settings.horizontal) {
      backwardPadding.style.display = 'inline-block';
      forwardPadding.style.display = 'inline-block';
    }

    content.append(backwardPadding, forwardPadding);
    viewport.appendChild(content);
    root.appendChild(viewport);
    document.body.appendChild(root);

    return { root, viewport, content };
  }

  private render(items: Item<Data>[]): void {
    const itemSet = new Set(items);
    this.renderedItems
      .filter(item => !itemSet.has(item))
      .forEach(item => item.element?.remove());

    const forwardPadding = this.contentElement.querySelector(
      '[data-padding-forward]'
    );
    if (!forwardPadding) {
      throw new Error('Forward padding element is missing');
    }

    for (const item of items) {
      let element = item.element;
      if (!element) {
        element = document.createElement('div');
        item.element = element;
      }

      element.dataset.sid = String(item.$index);
      element.style.boxSizing = 'border-box';
      element.style.margin = '0';
      element.style.padding = '0';
      element.style.position = item.invisible ? 'fixed' : '';
      element.style.left = item.invisible ? '-99999px' : '';

      let templateElement = element.firstElementChild as HTMLElement | null;
      if (!templateElement) {
        templateElement = document.createElement('div');
        templateElement.className = 'item';
        element.appendChild(templateElement);
      }
      templateElement.style.boxSizing = 'border-box';
      templateElement.style.margin = '0';
      templateElement.style.padding = '0';

      const dynamicSize = this.settings.dynamicSize as keyof Data | null;
      const horizontal = !!this.settings.horizontal;
      const configuredSize = horizontal
        ? this.settings.itemWidth
        : this.settings.itemHeight;
      const itemSize = dynamicSize
        ? Number(item.data[dynamicSize])
        : Number(configuredSize);
      if (Number.isFinite(itemSize)) {
        templateElement.style[horizontal ? 'width' : 'height'] =
          `${itemSize}px`;
        templateElement.style[horizontal ? 'overflowX' : 'overflowY'] =
          'hidden';
      }
      if (horizontal) {
        element.style.display = 'inline-block';
        templateElement.style.display = 'inline-block';
      }

      templateElement.innerHTML = `<span>${item.$index}</span>: <b>${item.data.text}</b>`;
      this.contentElement.insertBefore(element, forwardPadding);
    }

    this.renderedItems = [...items];
  }

  getElements(): HTMLElement[] {
    return Array.from(this.contentElement.querySelectorAll('[data-sid]'));
  }

  getElement(index: number): HTMLElement | null {
    return this.contentElement.querySelector(`[data-sid="${index}"]`);
  }

  getElementIndex(element: HTMLElement): number {
    return Number(element.dataset.sid);
  }

  getElementText(index: number): string | null {
    return this.getElement(index)?.innerText.trim() || null;
  }

  checkElementContentByIndex(index: number): boolean {
    return this.getElementText(index) === `${index}: item #${index}`;
  }

  checkElementId(element: HTMLElement, index: number): boolean {
    return element.dataset.sid === String(index);
  }

  getViewportSize(): number {
    return this.scroller.viewport.getSize();
  }

  getScrollableSize(): number {
    return this.scroller.viewport.getScrollableSize();
  }

  getScrollPosition(): number {
    return this.scroller.viewport.scrollPosition;
  }

  scrollTo(position: number): void {
    this.adapter.fix({ scrollPosition: position });
  }

  scrollMin(): void {
    this.scrollTo(0);
  }

  scrollMax(): void {
    this.scrollTo(Infinity);
  }

  waitNextCycle(): Promise<number> {
    return new Promise(resolve => this.workflow.cyclesDone$.once(resolve));
  }

  waitForAdapterInit(): Promise<void> {
    return new Promise(resolve => {
      const off = this.adapter.init$.on(initialized => {
        if (initialized) {
          off();
          resolve();
        }
      });
    });
  }

  async recreate(): Promise<void> {
    const initialized = this.waitForAdapterInit();
    this.workflow.dispose();
    this.resetContent();
    this.workflow = this.createWorkflow();
    await initialized;
    await this.adapter.relax();
  }

  captureInnerLoops<T>(
    count: number,
    snapshot: (loop: number) => T
  ): Promise<T[]> {
    if (count <= 0) {
      return Promise.resolve([]);
    }

    return new Promise<T[]>((resolve, reject) => {
      const snapshots: T[] = [];
      const innerLoop = this.scroller.state.cycle.innerLoop;
      const off = innerLoop.busy.on(pending => {
        if (pending) {
          return;
        }
        try {
          snapshots.push(snapshot(innerLoop.total));
          if (snapshots.length === count) {
            off();
            resolve(snapshots);
          }
        } catch (error) {
          off();
          reject(error);
        }
      });
    });
  }

  async relaxNext(): Promise<void> {
    await this.waitNextCycle();
    await this.adapter.relax();
  }

  private async runAndRelax(
    action: () => void | Promise<unknown>
  ): Promise<void> {
    const cycleDone = this.waitNextCycle();
    await action();
    await cycleDone;
    await this.adapter.relax();
  }

  scrollToRelax(position: number): Promise<void> {
    return this.runAndRelax(() =>
      this.adapter.fix({ scrollPosition: position })
    );
  }

  scrollMinRelax(): Promise<void> {
    return this.scrollToRelax(0);
  }

  scrollMaxRelax(): Promise<void> {
    return this.scrollToRelax(Infinity);
  }

  async scrollToIndexRelax(index: number, maxAttempts = 20): Promise<void> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const { firstIndex, lastIndex } = this.adapter.bufferInfo;
      const buffered = index >= firstIndex && index <= lastIndex;
      const edgeIndex = index > lastIndex ? lastIndex : firstIndex;
      const position = this.getScrollPosition();

      this.adapter.fix({
        scrollToItem: item => item.$index === (buffered ? index : edgeIndex)
      });

      if (position !== this.getScrollPosition()) {
        await this.relaxNext();
      }
      if (buffered) {
        return;
      }
    }

    throw new Error(`Unable to scroll to index ${index}`);
  }

  setDatasourceProcessor(processor: DatasourceProcessor<Data>): void {
    if (!this.setProcessor) {
      throw new Error('This test datasource does not support processing');
    }
    this.setProcessor(processor);
  }

  setItemProcessor(
    itemUpdater: (item: { $index: number; data: Data }) => unknown
  ): void {
    this.setDatasourceProcessor(items => items.forEach(itemUpdater));
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.workflow.dispose();
    const disposable = this.datasource as IDatasource<Data> & {
      dispose?: () => void;
    };
    disposable.dispose?.();
    this.root.remove();
    if (this.windowViewport) {
      window.scrollTo(0, 0);
    }
  }
}
