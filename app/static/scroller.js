(() => {
  class Dom {
    get viewport() {
      return document.getElementById('vscroll');
    }

    get itemWrapperTagName() {
      return 'div';
    }

    template(item) {
      return `<div class="item"><span>${item.data.id}</span>) ${item.data.text}</div>`;
    }
  }

  class Scroller {
    constructor(datasource, dom) {
      this.datasource = datasource;
      this.dom = dom ?? new Dom();
      this.oldItems = [];
      this.fwdPadding =
        this.dom.viewport.querySelector('[data-padding-forward]');

      const params = {
        consumer: {
          name: 'VScroll Testing',
          version: 'not published'
        },
        element: this.dom.viewport,
        datasource,
        run: (newItems) => {
          if (!newItems.length && !this.oldItems.length) {
            return;
          }
          this.processItems(newItems);
          this.oldItems = newItems;
        }
      };
      this.workflow = new VScroll.Workflow(params);
    }

    processItems(newItems) {
      this.oldItems
        .filter(item => !newItems.includes(item))
        .forEach(item => item.element.remove());
      const elements = [];
      let beforeElement = this.fwdPadding;
      for (let i = newItems.length - 1; i >= 0; i--) {
        const item = newItems[i];
        if (this.oldItems.includes(item)) {
          if (!elements.length) {
            beforeElement = item.element;
            continue;
          } else {
            break;
          }
        }
        elements.unshift(this.createItemElement(item));
      }
      elements.forEach(elt =>
        beforeElement.insertAdjacentElement('beforebegin', elt)
      );
    }

    createItemElement(item) {
      const element = document.createElement(this.dom.itemWrapperTagName);
      element.setAttribute('data-sid', String(item.$index));
      if (item.invisible) {
        element.style.position = 'fixed';
        element.style.top = '-99px';
      }
      element.innerHTML = this.dom.template(item);
      return element;
    }
  }

  window.__vscroll__.Dom = Dom;
  window.__vscroll__.Scroller = Scroller;
})();