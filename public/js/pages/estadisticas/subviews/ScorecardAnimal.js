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
      const hist = d.historial || [];

      const html = `
        <div class="modal-overlay" onclick="ScorecardAnimal.cerrar()">
          <div class="modal-content scorecard-modal" onclick="event.stopPropagation()" style="max-width:700px">
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
      Toast.error('Error al cargar scorecard');
    }
  },

  cerrar() {
    document.getElementById('scorecard-overlay')?.remove();
  }
};
