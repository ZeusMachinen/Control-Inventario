/**
 * ScorecardAnimal — Vista detallada de scorecard individual (modal).
 */
const ScorecardAnimal = {
  async mostrar(animalId) {
    try {
      const { data } = await API.get(`/analitica/scorecard/${animalId}`);
      const d = data.data || {};
      const a = d.animal || {};
      const sc = d.scorecard || {};
      const epd = d.epd || {};
      const ivm = d.ivm || null;
      const hist = d.historial || [];

      const ivmHTML = ivm ? (ivm.ivm_tipo === 'IVM-P' ? this.renderIVMP(ivm) : this.renderIVM(ivm)) : '';
      const html = `
        <div class="modal-overlay" onclick="ScorecardAnimal.cerrar()">
          <div class="modal-content scorecard-modal" onclick="event.stopPropagation()" style="max-width:780px">
            <div class="modal-header d-flex justify-content-between align-items-center">
              <h4>${a.nombre} <small class="text-muted">${a.sexo}</small></h4>
              <button class="btn-close" onclick="ScorecardAnimal.cerrar()"></button>
            </div>
            <div class="modal-body">
              <div class="row g-3 mb-3">
                <div class="col-6 col-md-3"><div class="kpi-mini"><span>EPD</span><strong>${epd.indice ?? '-'}${epd.provisional ? ' ⚠️' : ''}</strong></div></div>
                <div class="col-6 col-md-3"><div class="kpi-mini"><span>Veredicto</span><strong>${sc.veredicto || '-'}</strong></div></div>
                <div class="col-6 col-md-3"><div class="kpi-mini"><span>Edad</span><strong>${sc.edad_meses || '-'}m</strong></div></div>
                <div class="col-6 col-md-3"><div class="kpi-mini"><span>Estado</span><strong>${a.estado_reproductivo || '-'}</strong></div></div>
              </div>
              ${a.sexo === 'Hembra' ? `
                <div class="row g-3 mb-3">
                  <div class="col-4"><div class="kpi-mini"><span>Partos</span><strong>${sc.partos_total||0}</strong></div></div>
                  <div class="col-4"><div class="kpi-mini"><span>IEP</span><strong>${sc.iep_promedio_dias||'-'}d</strong></div></div>
                  <div class="col-4"><div class="kpi-mini"><span>Ult. parto</span><strong>${sc.dias_ultimo_parto||'-'}d</strong></div></div>
              ` : `
                <div class="row g-3 mb-3">
                  <div class="col-4"><div class="kpi-mini"><span>Tasa Vig.</span><strong>${sc.tasa_vigente||'-'}</strong></div></div>
                  <div class="col-4"><div class="kpi-mini"><span>Hijos</span><strong>${sc.hijos_total||0}</strong></div></div>
                  <div class="col-4"><div class="kpi-mini"><span>Peso Prom</span><strong>${sc.peso_nacer_prom||'-'}kg</strong></div></div>
              `}
              ${ivmHTML}
              <h6>Historial</h6>
              <div class="table-responsive" style="max-height:250px">
                <table class="table table-sm"><thead><tr><th>Fecha</th><th>Tipo</th><th>Detalle</th><th>Resultado</th></tr></thead>
                <tbody>${hist.slice(0,20).map(h => `<tr><td>${h.fecha||''}</td><td>${h.tipo}</td><td>${h.detalle||''}</td><td>${h.resultado||''}</td></tr>`).join('')}</tbody></table>
              </div>
            </div>
          </div>
        </div>`;

      const overlay = document.createElement('div');
      overlay.id = 'scorecard-overlay';
      overlay.innerHTML = html;
      document.body.appendChild(overlay);
    } catch (e) {
      const msg = e.response?.data?.error || e.message || 'Error al cargar scorecard';
      Toast.error(msg);
    }
  },

  cerrar() {
    document.getElementById('scorecard-overlay')?.remove();
  },

  renderIVM(ivm) {
    const scoreClass = ivm.ivm_final >= 68 ? 'text-success' : ivm.ivm_final >= 50 ? 'text-warning' : ivm.ivm_final >= 40 ? 'text-primary' : 'text-danger';
    return `
      <div class="ivm-breakdown mt-3">
        <h6 class="mb-2">IVM — Índice de Valor Maternal</h6>
        <div class="row g-2 mb-2">
          <div class="col-6 col-md-3"><div class="kpi-mini"><span>IVM Final</span><strong class="${scoreClass}">${ivm.ivm_final}</strong></div></div>
          <div class="col-6 col-md-3"><div class="kpi-mini"><span>IVM Bruto</span><strong>${ivm.ivm_bruto}</strong></div></div>
          <div class="col-6 col-md-3"><div class="kpi-mini"><span>Categoría</span><strong>${ivm.categoria || '-'}</strong></div></div>
          <div class="col-6 col-md-3"><div class="kpi-mini"><span>Confianza</span><strong>${((ivm.factor_confianza || 0) * 100).toFixed(0)}%</strong></div></div>
        </div>
        <div class="row g-2 mb-2">
          <div class="col-6 col-md-3"><div class="kpi-mini"><span>1. Edad 1er P.</span><strong>${ivm.edad_primer_parto_meses || '-'}m → ${ivm.puntaje_edad_primer_parto}pts</strong></div></div>
          <div class="col-6 col-md-3"><div class="kpi-mini"><span>2. Intervalo</span><strong>${ivm.promedio_iep_dias || '-'}d → ${ivm.puntaje_intervalo}pts</strong></div></div>
          <div class="col-6 col-md-3"><div class="kpi-mini"><span>3. Crías</span><strong>${ivm.cantidad_crias} → ${ivm.puntaje_crias}pts</strong></div></div>
          <div class="col-6 col-md-3"><div class="kpi-mini"><span>4. Consist.</span><strong>${ivm.puntaje_consistencia}pts</strong></div></div>
          <div class="col-6 col-md-3"><div class="kpi-mini"><span>5. Bono precoc.</span><strong>${ivm.bono_precocidad || 0}pts</strong></div></div>
        </div>
        ${ivm.detalle_crias && ivm.detalle_crias.length ? `
          <h6 class="mt-2 mb-1">Detalle de crías</h6>
          <div class="table-responsive" style="max-height:150px">
            <table class="table table-sm table-xs mb-2"><thead><tr><th>ID</th><th>Días vida</th><th>Estado</th><th>Puntaje</th></tr></thead>
            <tbody>${ivm.detalle_crias.map(c => `<tr><td>#${c.id}</td><td>${c.dias_vida}d</td><td>${c.estado}</td><td class="${c.puntaje < 0 ? 'text-danger fw-bold' : c.puntaje >= 25 ? 'text-success' : ''}">${c.puntaje}</td></tr>`).join('')}</tbody></table>
          </div>
        ` : ''}
        ${ivm.alerta ? `<div class="alert alert-warning py-1 px-2 mt-2 mb-0 small">⚠️ ${ivm.alerta}</div>` : ''}
      </div>
    `;
  },

  renderIVMP(ivm) {
    const score = ivm.ivm_p ?? ivm.ivm_final ?? '—';
    const scoreClass = score >= 68 ? 'text-success' : score >= 50 ? 'text-warning' : 'text-danger';
    return `
      <div class="ivm-breakdown mt-3">
        <h6 class="mb-2">IVM-P — Índice de Valor Maternal Provisional</h6>
        <div class="row g-2 mb-2">
          <div class="col-6 col-md-4"><div class="kpi-mini"><span>IVM-P</span><strong class="${scoreClass}">${score}</strong></div></div>
          <div class="col-6 col-md-4"><div class="kpi-mini"><span>Clasificación</span><strong>${ivm.categoria || '-'}</strong></div></div>
          <div class="col-6 col-md-4"><div class="kpi-mini"><span>Partos</span><strong>0 (preparto)</strong></div></div>
        </div>
        <div class="alert alert-info py-1 px-2 mt-2 mb-0 small">
          <i class="fas fa-info-circle me-1"></i>Hembra sin partos — se evalúa con IVM-P según edad y estado reproductivo. Al primer parto pasará al IVM completo.
        </div>
        ${ivm.alerta ? `<div class="alert alert-warning py-1 px-2 mt-2 mb-0 small">⚠️ ${ivm.alerta}</div>` : ''}
      </div>
    `;
  },
};
