/**
 * RankingsView — Podium top-3 + tabla completa de vacas o toros.
 */
const RankingsView = {
  tipoActual: 'vacas',

  async render(container) {
    const qp = MicrositioEstadisticasPage.queryParams();
    // agregar tipo al query param
    const sep = qp ? '&' : '?';
    try {
      const { data } = await API.get(`/analitica/rankings${qp}${sep}tipo=${this.tipoActual}`);
      const ranking = data.data?.ranking || [];

      const top3 = ranking.slice(0, 3);
      const resto = ranking.slice(3);

      const podiumHTML = top3.length ? `
        <div class="podium">
          ${top3.map((a, i) => {
            const medal = ['gold', 'silver', 'bronze'][i];
            return `<div class="podium-card ${medal}" onclick="RankingsView.verScorecard(${a.id})">
              <div class="podium-medal">${['🥇','🥈','🥉'][i]}</div>
              <div class="podium-name">${a.nombre}</div>
              <div class="podium-score">Score: ${a.score || a.tasa_vigente || '-'}</div>
            </div>`;
          }).join('')}
        </div>
      ` : '<p class="text-muted">Sin datos suficientes para ranking.</p>';

      const cols = this.tipoActual === 'vacas'
        ? ['Nombre','Score','Partos','IEP (dias)','Dias ult. parto','Edad 1er parto']
        : ['Nombre','Tasa Vigente','Crias/ano','Peso Prom Crias','Tendencia','Veredicto'];

      const rows = resto.map(a => this.tipoActual === 'vacas'
        ? `<tr onclick="RankingsView.verScorecard(${a.id})" style="cursor:pointer">
            <td>${a.nombre}</td><td>${a.score}</td><td>${a.partos_total||0}</td>
            <td>${a.iep_promedio_dias||'-'}</td><td>${a.dias_ultimo_parto||'-'}</td>
            <td>${a.edad_primer_parto_meses ? a.edad_primer_parto_meses+'m' : '-'}</td></tr>`
        : `<tr onclick="RankingsView.verScorecard(${a.id})" style="cursor:pointer">
            <td>${a.nombre}</td><td>${a.tasa_vigente}</td><td>${a.hijos_total||0}</td>
            <td>${a.peso_nacer_prom||'-'}</td><td>${a.tendencia||'-'}</td>
            <td><span class="badge bg-${a.veredicto?.includes('Buen')?'success':a.veredicto?.includes('Alerta')?'warning':'secondary'}">${a.veredicto||'-'}</span></td></tr>`
      ).join('');

      container.innerHTML = `
        <div class="d-flex gap-2 mb-4">
          <button class="btn ${this.tipoActual==='vacas'?'btn-primary':'btn-outline-primary'}" onclick="RankingsView.cambiarTipo('vacas')">🐄 Vacas</button>
          <button class="btn ${this.tipoActual==='toros'?'btn-primary':'btn-outline-primary'}" onclick="RankingsView.cambiarTipo('toros')">🐂 Toros</button>
        </div>
        ${podiumHTML}
        <div class="table-responsive mt-4">
          <table class="table table-sm table-hover">
            <thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
    } catch (e) {
      container.innerHTML = `<div class="alert alert-danger">Error: ${e.message}</div>`;
    }
  },

  async cambiarTipo(tipo) {
    this.tipoActual = tipo;
    const content = document.getElementById('micrositio-content');
    if (content) await this.render(content);
  },

  verScorecard(id) {
    ScorecardAnimal.mostrar(id);
  }
};
