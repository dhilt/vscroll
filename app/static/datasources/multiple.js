(() => {
  const Datasource = VScroll.makeDatasource();

  const datasource1 = new Datasource({
    get: (index, count, success) => {
      const data = [];
      for (let i = index; i <= index + count - 1; i++) {
        data.push({ id: i, text: 'item #' + i });
      }
      success(data);
    }
  });

  const datasource2 = new Datasource({
    get: (index, count, success) => {
      const data = [];
      for (let i = index; i <= index + count - 1; i++) {
        data.push({ id: i, text: 'item #' + i + ' *' });
      }
      success(data);
    }
  });

  window.__vscroll__.datasource1 = datasource1;
  window.__vscroll__.datasource2 = datasource2;
})();
