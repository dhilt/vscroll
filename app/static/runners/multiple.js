(() => {
  window.addEventListener('DOMContentLoaded', () => {
    const { Dom, Scroller, datasource1, datasource2 } = window.__vscroll__;
    if (datasource1) {
      const dom1 = new Dom();
      Object.defineProperty(dom1, 'viewport', {
        get() {
          return document.getElementById('vscroll1');
        }
      });
      window.__vscroll__.scroller1 = new Scroller(datasource1, dom1);
    }
    if (datasource2) {
      const dom2 = new Dom();
      Object.defineProperty(dom2, 'viewport', {
        get() {
          return document.getElementById('vscroll2');
        }
      });
      window.__vscroll__.scroller2 = new Scroller(datasource2, dom2);
    }
  });
})();
