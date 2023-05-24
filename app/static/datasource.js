(() => {
  const Datasource = VScroll.makeDatasource();

  const datasource = new Datasource({
    get: (index, count, success) => {
      const data = [];
      for (let i = index; i <= index + count - 1; i++) {
        data.push({ id: i, text: 'item #' + i });
      }
      success(data);
    },
    devSettings: { debug: true }
  });

  window.__vscroll__.datasource = datasource;
})();