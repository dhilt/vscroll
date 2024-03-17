
// virtual scroll engine params
const workflowParams = {
  consumer: {
    name: 'VScroll Demo (CDN)',
    version: 'not published'
  },
  element: document.getElementById('vscroll'),
  datasource: {
    get: (index, count, success) => {
      const data = [];
      for (let i = index; i <= index + count - 1; i++) {
        data.push({ id: i, text: 'item #' + i });
      }
      success(data);
    }
  },
  run: (newItems) => {
    if (!newItems.length && !oldItems.length) {
      return;
    }
    processItems(newItems, oldItems);
    oldItems = newItems;
  },
};

// old items storage
let oldItems = [];

// the renderer; it detects change and provide consistent view
const processItems = (newItems, oldItems) => {
  // remove elements not present
  oldItems
    .filter(item => !newItems.includes(item))
    .forEach(item => item.element.remove());
  // create and insert new elements
  const elements = [];
  let beforeElement =
    workflowParams.element.querySelector('[data-padding-forward]');
  for (let i = newItems.length - 1; i >= 0; i--) {
    if (oldItems.includes(newItems[i])) {
      if (!elements.length) {
        beforeElement = newItems[i].element;
        continue;
      } else {
        break;
      }
    }
    elements.unshift(createItemElement(newItems[i]));
  }
  elements.forEach(elt =>
    beforeElement.insertAdjacentElement('beforebegin', elt)
  );
};

// creates and returns single item HTML element
const createItemElement = item => {
  const element = document.createElement('div');
  element.setAttribute('data-sid', item.nodeId);
  if (item.invisible) {
    element.style.position = 'fixed';
    element.style.top = '-99px';
  }
  element.innerHTML =
    `<div class="item">
      <span>${item.$index}</span>)
      ${item.data.text}
    </div>`;
  return element;
};

// run the VScroll Workflow
new VScroll.Workflow(workflowParams);

const versionElt = document.getElementById(`vscroll-core-version`);
versionElt.innerHTML = `Package version: ${VScroll.packageInfo.name} v${VScroll.packageInfo.version}.`;
