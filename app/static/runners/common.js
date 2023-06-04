(() => {
  window.addEventListener('DOMContentLoaded', () => {
    const { Scroller, datasource } = window.__vscroll__;
    if (datasource) {
      window.__vscroll__.scroller = new Scroller(datasource);
    }
  });
})();
