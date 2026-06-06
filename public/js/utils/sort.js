const SortUtil = {
  comparar(a, b, direccion) {
    const dir = direccion === 'asc' ? 1 : -1;
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    if (typeof a === 'number' && typeof b === 'number') return (a - b) * dir;
    return String(a).localeCompare(String(b), 'es') * dir;
  },

  toggleDir(actual) {
    return actual === 'asc' ? 'desc' : 'asc';
  },

  indicador(columna, columnaActual, direccion) {
    if (columna !== columnaActual) return '';
    return direccion === 'asc' ? ' ▲' : ' ▼';
  },

  actualizarEncabezados(tbodyId, columnaActual, direccion) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    const tabla = tbody.closest('table');
    if (!tabla) return;
    tabla.querySelectorAll('.th-sortable').forEach(th => {
      const col = th.dataset.columna;
      let texto = th.dataset.etiqueta;
      if (!texto) {
        texto = th.textContent.replace(/[▲▼]\s*$/, '').trim();
        th.dataset.etiqueta = texto;
      }
      th.classList.toggle('th-active', col === columnaActual);
      th.innerHTML = texto + (col === columnaActual ? (direccion === 'asc' ? ' ▲' : ' ▼') : '');
    });
  },
};
