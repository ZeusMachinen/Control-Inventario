/**
 * RankingsView — Galería top-3 con fotos + lista de tarjetas de ranking.
 * Diseño visual completo con podium escalonado, score bars, y métricas.
 */
const RankingsView = {
  tipoActual: 'vacas',
  invertido: false,

  async render(container) {
    const qp = MicrositioEstadisticasPage.queryParams();
    const sep = qp ? '&' : '?';
    try {
      const { data } = await API.get(`/analitica/rankings${qp}${sep}tipo=${this.tipoActual}`);
      const rankingRaw = data.data?.ranking || [];
      const ranking = this.invertido ? [...rankingRaw].reverse() : rankingRaw;

      const top3 = ranking.slice(0, 3);
      const resto = ranking.slice(3);

      const headerHTML = this.renderHeader();
      const statsHTML  = this.renderStatsBar(ranking);
      const podiumHTML = this.renderPodium(top3);
      const cardsHTML  = this.renderRankingCards(resto, 4);

      container.innerHTML = `
        <div class="rankings-view">
          ${headerHTML}
          ${this.tipoActual === 'vacas' ? this.renderIVMInfo() : ''}
          ${statsHTML}
          ${podiumHTML}
          ${cardsHTML}
        </div>
      `;

      // Animación de entrada escalonada
      requestAnimationFrame(() => {
        container.querySelectorAll('.ranking-card, .rankings-podium-card').forEach((el, i) => {
          el.style.animationDelay = `${i * 0.06}s`;
          el.classList.add('visible');
        });
      });
    } catch (e) {
      container.innerHTML = `<div class="alert alert-danger">Error al cargar ranking: ${e.message}</div>`;
    }
  },

  renderHeader() {
    return `
      <div class="rankings-header">
        <div class="rankings-header-left">
          <div class="rankings-icon"><i class="fas fa-trophy"></i></div>
          <div>
            <h2>${this.invertido ? 'Peores' : 'Ranking'}</h2>
            <p class="rankings-subtitle">${this.invertido ? 'Menor rendimiento primero' : 'Top reproductores por rendimiento'}</p>
          </div>
        </div>
        <div class="rankings-toggle">
          <button class="rankings-toggle-btn ${this.tipoActual==='vacas'?'active':''}" onclick="RankingsView.cambiarTipo('vacas')">
            <i class="fas fa-venus me-1"></i>Vacas
          </button>
          <button class="rankings-toggle-btn ${this.tipoActual==='toros'?'active':''}" onclick="RankingsView.cambiarTipo('toros')">
            <i class="fas fa-mars me-1"></i>Toros
          </button>
          <button class="rankings-toggle-btn rankings-invert-btn ${this.invertido?'active':''}" onclick="RankingsView.toggleInvertir()" title="${this.invertido ? 'Mostrar mejores' : 'Mostrar peores'}">
            <i class="fas fa-${this.invertido ? 'sort-amount-up' : 'sort-amount-down'} me-1"></i>${this.invertido ? 'Mejores' : 'Peores'}
          </button>
        </div>
      </div>
    `;
  },

  renderIVMInfo() {
    return `
      <div class="ivm-info-panel">
        <button class="ivm-info-toggle" onclick="this.nextElementSibling.classList.toggle('open');this.classList.toggle('active')">
          <i class="fas fa-info-circle me-2"></i>¿Cómo se calcula el IVM?
          <i class="fas fa-chevron-down ms-auto ivm-chevron"></i>
        </button>
        <div class="ivm-info-body">
          <p class="mb-2"><strong>IVM</strong> = Índice de Valor Maternal (0-100). Mide el desempeño reproductivo y maternal de cada vaca.</p>
          <div class="ivm-blocks">
            <div class="ivm-block">
              <div class="ivm-block-header"><span class="ivm-block-num">1</span> Edad al primer parto <strong>20 pts</strong></div>
              <div class="ivm-block-detail">24-30m=20 · 31-34m=17 · 35-38m=13 · 39-42m=8 · <span class="text-danger">+42m=-5</span></div>
            </div>
            <div class="ivm-block">
              <div class="ivm-block-header"><span class="ivm-block-num">2</span> Intervalo entre partos <strong>25 pts</strong></div>
              <div class="ivm-block-detail">≤365d=25 · ≤420d=22.5 · ≤450d=20 · ≤480d=17.5 · ≤540d=12.5 · ≤600d=10 · ≤700d=5 · >700d=0<br>
              <em>1 solo parto: 15 pts si está Preñada/Lactando, 0 si está Vacía</em></div>
            </div>
            <div class="ivm-block">
              <div class="ivm-block-header"><span class="ivm-block-num">3</span> Resultado de crías <strong>35 pts</strong></div>
              <div class="ivm-block-detail">Vendida=35 · Viva desarrollo=29.8 · Viva joven=24.5 · Muerta 31+d=12.3 · Muerta 8-30d=3.5<br>
              <span class="text-danger">Muerta 0-7d=-1.8 (única)</span> · <span class="text-danger">Muerta 0-7d=-14 (si hay 2+)</span><br>
              <em>Se promedian todas las crías. 2+ muertes neonatales castigan fuerte.</em></div>
            </div>
            <div class="ivm-block">
              <div class="ivm-block-header"><span class="ivm-block-num">4</span> Productividad <strong>15 pts</strong></div>
              <div class="ivm-block-detail">Partos/año reproductivo: ≥0.95=15 · ≥0.85=12.8 · ≥0.75=9.8 · ≥0.60=6 · <0.60=2.3</div>
            </div>
            <div class="ivm-block">
              <div class="ivm-block-header"><span class="ivm-block-num">5</span> Consistencia <strong>5 pts</strong></div>
              <div class="ivm-block-detail">Base: 1p=2.5 · 2p=3.3 · 3p=4 · 4p=4.5 · 5+p=5. <span class="text-danger">Penalizaciones:</span><br>
              1 cría muerta -30d=<span class="text-danger">-2</span> · 2=<span class="text-danger">-5</span> · 3+=<span class="text-danger">-6</span> · 2+ muertes 0-7d=<span class="text-danger">-3</span></div>
            </div>
            <div class="ivm-block" style="border-left:3px solid #FFD700">
              <div class="ivm-block-header"><span class="ivm-block-num" style="background:#F57C00">+</span> Bono precocidad <strong>+5 c/u</strong></div>
              <div class="ivm-block-detail">Si 1<super>er</super> parto fue a los 24-30m: <strong>+5</strong> por cada intervalo ≤420d consecutivo.<br>
              <em>Premia vacas que empiezan jóvenes y mantienen ritmo anual constante.</em></div>
            </div>
          </div>
          <div class="ivm-footer-info">
            <strong>Factor de confianza:</strong> 1 parto=×0.60 · 2=×0.75 · 3=×0.90 · 4+=×1.00<br>
            <strong>Fórmula:</strong> IVM = 50 + confianza × (Bruto − 50)<br>
            <strong>Categorías:</strong> <span class="badge bg-warning text-dark">≥85 Élite</span> <span class="badge bg-success">≥75 Muy buena</span> <span class="badge bg-info">≥65 Buena</span> <span class="badge bg-secondary">≥50 Regular</span> <span class="badge bg-danger"><50 Mala</span><br>
            <strong class="text-danger">⚠️ Reglas de descarte:</strong> 2+ crías muertas -30d o 2+ intervalos +700d → "Línea de descarte" automático
          </div>
        </div>
      </div>
    `;
  },

  renderStatsBar(ranking) {
    if (!ranking.length) return '';
    const total = ranking.length;
    const topScore = this.tipoActual === 'vacas'
      ? ranking[0]?.ivm_final ?? '-'
      : ranking[0]?.tasa_vigente ?? '-';
    const topLabel = this.invertido ? 'Peor Score' : 'Top Score';
    const avgScore = this.tipoActual === 'vacas'
      ? Math.round(ranking.reduce((s, a) => s + (a.ivm_final || 0), 0) / total)
      : ((ranking.reduce((s, a) => s + (parseFloat(a.tasa_vigente) || 0), 0) / total) * 100).toFixed(1);

    return `
      <div class="rankings-stats-bar">
        <div class="rankings-stat">
          <i class="fas fa-list-ol"></i>
          <span>Rankeados</span>
          <strong>${total}</strong>
        </div>
        <div class="rankings-stat">
          <i class="fas fa-crown"></i>
          <span>${topLabel}</span>
          <strong class="${this.invertido ? 'text-danger' : 'text-gold'}">${topScore}</strong>
        </div>
        <div class="rankings-stat">
          <i class="fas fa-chart-simple"></i>
          <span>Promedio</span>
          <strong>${avgScore}</strong>
        </div>
      </div>
    `;
  },

  renderPodium(top3) {
    if (!top3.length) {
      return `<div class="rankings-empty"><i class="fas fa-chart-bar"></i><p>Sin datos suficientes para ranking</p></div>`;
    }

    // Layout visual: 2do — 1ro — 3ro
    const podiumOrder = top3.length === 3
      ? [top3[1], top3[0], top3[2]]
      : top3.length === 2
        ? [null, top3[0], top3[1]]
        : [null, top3[0], null];

    const medals = ['silver', 'gold', 'bronze'];
    const emojiMedals = ['🥈', '🥇', '🥉'];
    const rankNums = [2, 1, 3];

    return `
      <div class="rankings-podium">
        ${podiumOrder.map((a, pos) => {
          if (!a) return '<div class="rankings-podium-card podium-empty"></div>';
          const fotoSrc = a.foto ? `/api/${a.foto}` : null;
          const realIdx = rankNums[pos] - 1;

          return `
            <div class="rankings-podium-card podium-${medals[realIdx]}" onclick="RankingsView.verScorecard(${a.id})">
              <div class="podium-rank-badge">${emojiMedals[realIdx]}</div>
              <span class="podium-rank-num">#${rankNums[pos]}</span>
              <div class="podium-photo-wrapper">
                ${fotoSrc
                  ? `<img src="${fotoSrc}" alt="${a.nombre}" class="podium-photo" loading="lazy"
                          onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
                     <div class="podium-photo-fallback"><i class="fas fa-image"></i></div>`
                  : `<div class="podium-photo-fallback"><i class="fas fa-paw fa-2x"></i></div>`
                }
              </div>
              <div class="podium-info">
                <h3 class="podium-name">${this.escapeHTML(a.nombre)}</h3>
                ${this.tipoActual === 'vacas' ? `
                  <div class="podium-score-badge">${a.ivm_final} IVM</div>
                  <div class="podium-metrics">
                    <div class="podium-metric">
                      <span class="podium-metric-value">${a.cantidad_partos || 0}</span>
                      <span class="podium-metric-label">Partos</span>
                    </div>
                    <div class="podium-metric">
                      <span class="podium-metric-value">${a.promedio_iep_dias || '-'}d</span>
                      <span class="podium-metric-label">IEP</span>
                    </div>
                    <div class="podium-metric">
                      <span class="podium-metric-value">${a.cantidad_crias || 0}</span>
                      <span class="podium-metric-label">Crías</span>
                    </div>
                  </div>
                  <div class="podium-category ${this.categoryClass(a.categoria)}">${a.categoria || '-'}</div>
                  ${a.alerta ? `<div class="podium-alert">⚠️ ${a.alerta}</div>` : ''}
                ` : `
                  <div class="podium-score-badge">${a.tasa_vigente || '-'}</div>
                  <div class="podium-metrics">
                    <div class="podium-metric">
                      <span class="podium-metric-value">${a.hijos_total || 0}</span>
                      <span class="podium-metric-label">Hijos</span>
                    </div>
                    <div class="podium-metric">
                      <span class="podium-metric-value">${a.peso_nacer_prom || '-'}kg</span>
                      <span class="podium-metric-label">Peso prom</span>
                    </div>
                    <div class="podium-metric">
                      <span class="podium-metric-value">${a.tendencia || '-'}</span>
                      <span class="podium-metric-label">Tendencia</span>
                    </div>
                  </div>
                `}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  renderRankingCards(resto, startRank) {
    if (!resto.length) return '';

    return `
      <div class="rankings-section-header">
        <h3>Posiciones ${startRank}+</h3>
      </div>
      <div class="ranking-cards">
        ${resto.map((a, i) => {
          const rank = startRank + i;
          const fotoSrc = a.foto ? `/api/${a.foto}` : null;
          const scorePercent = this.tipoActual === 'vacas'
            ? Math.min(100, (a.ivm_final || 0))
            : Math.min(100, ((parseFloat(a.tasa_vigente) || 0) / Math.max(0.01, parseFloat(resto[0]?.tasa_vigente) || 0.01)) * 100);

          return `
            <div class="ranking-card visible" onclick="RankingsView.verScorecard(${a.id})" style="animation-delay:${i * 0.05}s">
              <div class="ranking-card-rank">
                <span class="ranking-card-rank-num">${rank}</span>
              </div>
              <div class="ranking-card-photo">
                ${fotoSrc
                  ? `<img src="${fotoSrc}" alt="${a.nombre}" loading="lazy"
                          onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
                     <div class="ranking-card-photo-fb"><i class="fas fa-paw"></i></div>`
                  : `<div class="ranking-card-photo-fb"><i class="fas fa-paw"></i></div>`
                }
              </div>
              <div class="ranking-card-body">
                <div class="ranking-card-header">
                  <h4 class="ranking-card-name">${this.escapeHTML(a.nombre)}</h4>
                  ${this.tipoActual === 'vacas'
                    ? `<div class="ranking-card-score">${a.ivm_final} <span>IVM</span></div>`
                    : `<div class="ranking-card-score">${a.tasa_vigente || '-'}</div>`
                  }
                </div>
                <div class="ranking-card-bar">
                  <div class="ranking-card-bar-fill" style="width:${scorePercent}%"></div>
                </div>
                <div class="ranking-card-metrics">
                  ${this.tipoActual === 'vacas' ? `
                    <span class="badge ${this.categoryBadgeClass(a.categoria)}">${a.categoria || '-'}</span>
                    <span><i class="fas fa-calendar-check"></i>${a.cantidad_partos || 0} partos</span>
                    <span><i class="fas fa-clock"></i>IEP ${a.promedio_iep_dias || '-'}d</span>
                    <span><i class="fas fa-skull"></i>${a.crias_muertas_antes_30 || 0} bajas</span>
                    ${a.alerta ? `<span class="text-danger"><i class="fas fa-exclamation-triangle"></i>${a.alerta}</span>` : ''}
                  ` : `
                    <span><i class="fas fa-baby"></i>${a.hijos_total || 0} crías</span>
                    <span><i class="fas fa-weight-scale"></i>${a.peso_nacer_prom || '-'}kg</span>
                    <span><i class="fas fa-chart-line"></i>${a.tendencia || '-'}</span>
                    <span class="badge ${a.veredicto?.includes('Buen') ? 'bg-success' : a.veredicto?.includes('Alerta') ? 'bg-warning text-dark' : a.veredicto?.includes('Revisar') ? 'bg-danger' : 'bg-secondary'}">${a.veredicto || '-'}</span>
                  `}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  categoryClass(categoria) {
    const map = {
      'Élite':                 'cat-elite',
      'Muy buena':             'cat-muy-buena',
      'Buena':                 'cat-buena',
      'Regular':               'cat-regular',
      'Mala / revisar descarte': 'cat-mala',
      'Descarte recomendado':  'cat-descarte',
      'Mala / Línea de descarte': 'cat-mala',
    };
    return map[categoria] || 'cat-regular';
  },

  categoryBadgeClass(categoria) {
    const map = {
      'Élite':                 'bg-warning text-dark',
      'Muy buena':             'bg-success',
      'Buena':                 'bg-info text-dark',
      'Regular':               'bg-secondary',
      'Mala / revisar descarte': 'bg-danger',
      'Descarte recomendado':  'bg-dark',
      'Mala / Línea de descarte': 'bg-danger',
    };
    return map[categoria] || 'bg-secondary';
  },

  async cambiarTipo(tipo) {
    this.tipoActual = tipo;
    const content = document.getElementById('micrositio-content');
    if (content) await this.render(content);
  },

  async toggleInvertir() {
    this.invertido = !this.invertido;
    const content = document.getElementById('micrositio-content');
    if (content) await this.render(content);
  },

  verScorecard(id) {
    ScorecardAnimal.mostrar(id);
  }
};
