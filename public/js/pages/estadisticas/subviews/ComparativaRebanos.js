/**
 * ComparativaRebanos — Comparativa entre rebanos y entre periodos (YoY/MoM).
 */
const ComparativaRebanos = {
  modo: 'periodos', // 'periodos' | 'rebanos'

  async render(container) {
    const hoy = new Date();
    const mesActual = hoy.getMonth(); // 0-indexed
    const anioActual = hoy.getFullYear();

    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    let anos = '';
    for (let y = anioActual; y >= anioActual - 5; y--) anos += `<option value="${y}" ${y === anioActual ? 'selected' : ''}>${y}</option>`;

    container.innerHTML = `
      <div class="d-flex gap-2 mb-3">
        <button class="btn btn-sm ${this.modo==='periodos'?'btn-primary':'btn-outline-primary'}" onclick="ComparativaRebanos.cambiarModo('periodos')">Periodo vs Periodo</button>
        <button class="btn btn-sm ${this.modo==='rebanos'?'btn-primary':'btn-outline-primary'}" onclick="ComparativaRebanos.cambiarModo('rebanos')">Rebano vs Rebano</button>
      </div>
      <div id="comparativa-content"></div>
    `;

    await this.cargarContenido();
  },

  async cambiarModo(modo) {
    this.modo = modo;
    const content = document.getElementById('micrositio-content');
    if (content) await this.render(content);
  },

  async cargarContenido() {
    const content = document.getElementById('comparativa-content');
    if (!content) return;

    if (this.modo === 'periodos') {
      await this.renderPeriodos(content);
    } else {
      await this.renderRebanos(content);
    }
  },

  async renderPeriodos(content) {
    const hoy = new Date();
    const anioActual = hoy.getFullYear();
    let anos = '';
    for (let y = anioActual; y >= anioActual - 5; y--) anos += `<option value="${y}">${y}</option>`;
    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

    content.innerHTML = `
      <div class="comparativa-periodos row g-2 align-items-end mb-4">
        <div class="col-auto"><label class="form-label small">Periodo A</label>
          <select id="cmp-mes-a" class="form-select form-select-sm" onchange="ComparativaRebanos.comparar()" style="width:130px">
            ${meses.map((m,i) => `<option value="${i+1}">${m}</option>`).join('')}
          </select></div>
        <div class="col-auto"><select id="cmp-anio-a" class="form-select form-select-sm" onchange="ComparativaRebanos.comparar()" style="width:100px">${anos.replace('selected','')}</select></div>
        <div class="col-auto"><span class="fs-4">vs</span></div>
        <div class="col-auto"><label class="form-label small">Periodo B</label>
          <select id="cmp-mes-b" class="form-select form-select-sm" onchange="ComparativaRebanos.comparar()" style="width:130px">
            ${meses.map((m,i) => `<option value="${i+1}">${m}</option>`).join('')}
          </select></div>
        <div class="col-auto"><select id="cmp-anio-b" class="form-select form-select-sm" onchange="ComparativaRebanos.comparar()" style="width:100px">${anos}</select></div>
        <div class="col-auto"><button class="btn btn-primary btn-sm" onclick="ComparativaRebanos.comparar()"><i class="fas fa-balance-scale me-1"></i>Comparar</button></div>
      </div>
      <div id="comparativa-resultado"><p class="text-muted">Selecciona dos periodos y hace clic en Comparar.</p></div>
    `;

    // Setear defaults: mes actual vs mismo mes ano anterior
    const mesIdx = hoy.getMonth();
    document.getElementById('cmp-mes-a').value = mesIdx + 1;
    document.getElementById('cmp-anio-a').value = anioActual;
    document.getElementById('cmp-mes-b').value = mesIdx + 1;
    document.getElementById('cmp-anio-b').value = anioActual - 1;
  },

  async comparar() {
    const mesA = document.getElementById('cmp-mes-a')?.value;
    const anioA = document.getElementById('cmp-anio-a')?.value;
    const mesB = document.getElementById('cmp-mes-b')?.value;
    const anioB = document.getElementById('cmp-anio-b')?.value;
    if (!mesA || !anioA || !mesB || !anioB) return;

    const ultimoDiaA = new Date(+anioA, +mesA, 0).getDate();
    const ultimoDiaB = new Date(+anioB, +mesB, 0).getDate();
    const desdeA = `${anioA}-${String(mesA).padStart(2,'0')}-01`;
    const hastaA = `${anioA}-${String(mesA).padStart(2,'0')}-${String(ultimoDiaA).padStart(2,'0')}`;
    const desdeB = `${anioB}-${String(mesB).padStart(2,'0')}-01`;
    const hastaB = `${anioB}-${String(mesB).padStart(2,'0')}-${String(ultimoDiaB).padStart(2,'0')}`;

    const resultado = document.getElementById('comparativa-resultado');
    if (!resultado) return;
    resultado.innerHTML = '<div class="text-center py-3"><i class="fas fa-spinner fa-spin"></i> Comparando...</div>';

    try {
      const rid = MicrositioEstadisticasPage.rebanoId();
      const qp = rid ? `&rebano_id=${rid}` : '';
      const [resA, resB] = await Promise.all([
        API.get(`/analitica/dashboard-kpis?fecha_desde=${desdeA}&fecha_hasta=${hastaA}${qp}`),
        API.get(`/analitica/dashboard-kpis?fecha_desde=${desdeB}&fecha_hasta=${hastaB}${qp}`)
      ]);
      const a = resA.data?.data || {};
      const b = resB.data?.data || {};

      const filas = [
        ['Total Animales', a.total_animales, b.total_animales],
        ['Nacidos en Finca', a.nacidos_finca, b.nacidos_finca],
        ['Comprados', a.comprados, b.comprados],
        ['Prenadas', a.prenadas, b.prenadas],
        ['Lactando', a.lactando, b.lactando],
        ['Tasa Natalidad', (a.tasa_natalidad||0)+'%', (b.tasa_natalidad||0)+'%'],
        ['Tasa Prenez', (a.tasa_prenez||0)+'%', (b.tasa_prenez||0)+'%'],
        ['Ganancia Neta', Formateador.moneda(a.ganancia_neta), Formateador.moneda(b.ganancia_neta)],
        ['Costo/Cabeza', Formateador.moneda(a.costo_por_cabeza), Formateador.moneda(b.costo_por_cabeza)],
        ['Vacunacion 3m', (a.cobertura_vacunacion||0)+'%', (b.cobertura_vacunacion||0)+'%'],
      ];

      const variacion = (va, vb) => {
        if (typeof va === 'number' && typeof vb === 'number' && vb !== 0) {
          const pct = ((va - vb) / Math.abs(vb)) * 100;
          return `<span class="${pct>0?'text-success':pct<0?'text-danger':'text-muted'}">${pct>0?'+':''}${pct.toFixed(1)}% ${pct>0?'▲':pct<0?'▼':'◆'}</span>`;
        }
        return '—';
      };

      const mesLabel = (m) => ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][+m];
      const labelA = `${mesLabel(mesA)} ${anioA}`;
      const labelB = `${mesLabel(mesB)} ${anioB}`;

      resultado.innerHTML = `
        <div class="table-responsive">
          <table class="table table-sm">
            <thead><tr><th>KPI</th><th>${labelA}</th><th>${labelB}</th><th>Variacion</th></tr></thead>
            <tbody>${filas.map(f => `<tr>
              <td><strong>${f[0]}</strong></td><td>${f[1]??'-'}</td><td>${f[2]??'-'}</td>
              <td>${variacion(f[1], f[2])}</td></tr>`).join('')}</tbody>
          </table>
        </div>
      `;
    } catch (e) {
      resultado.innerHTML = `<div class="alert alert-danger">Error al comparar: ${e.message}</div>`;
    }
  },

  async renderRebanos(content) {
    try {
      const { data } = await API.get('/analitica/rebanos/comparativa');
      const rebanos = data.data?.rebanos || [];
      if (!rebanos.length) { content.innerHTML = '<p class="text-muted">No hay rebanos activos.</p>'; return; }
      content.innerHTML = `
        <div class="table-responsive">
          <table class="table table-sm table-bordered">
            <thead><tr><th>Rebano</th>${rebanos.map(r => `<th>${r.nombre}</th>`).join('')}</tr></thead>
            <tbody>
              <tr><td><strong>Total Animales</strong></td>${rebanos.map(r => `<td>${Formateador.numero(r.total_animales)}</td>`).join('')}</tr>
              <tr><td><strong>Riesgo Descarte</strong></td>${rebanos.map(r => `<td><span class="badge bg-${(r.riesgo_descarte?.pct_riesgo||0)>15?'warning':'success'}">${r.riesgo_descarte?.pct_riesgo||0}%</span></td>`).join('')}</tr>
              ${Object.keys(rebanos[0]?.composicion || {}).slice(0, 6).map(cat => `
                <tr><td>${cat}</td>${rebanos.map(r => `<td>${r.composicion?.[cat]?.cantidad || 0}</td>`).join('')}</tr>
              `).join('')}
            </tbody>
          </table>
        </div>`;
    } catch (e) { content.innerHTML = `<div class="alert alert-danger">Error: ${e.message}</div>`; }
  }
};
