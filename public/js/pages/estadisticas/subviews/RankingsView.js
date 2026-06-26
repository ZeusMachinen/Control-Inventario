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
      const rankingData = data.data?.ranking || {};

      // Toros: flat array, igual que antes
      if (this.tipoActual === 'toros') {
        const rankingRaw = Array.isArray(rankingData) ? rankingData : [];
        const ranking = this.invertido ? [...rankingRaw].reverse() : rankingRaw;
        const top3 = ranking.slice(0, 3);
        const resto = ranking.slice(3);

        container.innerHTML = `
          <div class="rankings-view">
            ${this.renderHeader()}
            ${this.renderStatsBarToros(ranking)}
            ${this.renderPodium(top3)}
            ${this.renderRankingCards(resto, 4)}
          </div>
        `;
        return;
      }

      // Vacas: 2 grupos
      const grupoA = rankingData.grupo_a || []; // vacas con partos
      const grupoB = rankingData.grupo_b || []; // preparto

      // Podio: top 3 SOLO de grupo A (vacas con partos)
      const rankingA = this.invertido ? [...grupoA].reverse() : [...grupoA];
      const top3 = rankingA.slice(0, 3);

      const headerHTML = this.renderHeader();
      const statsHTML  = this.renderStatsBar(grupoA);
      const podiumHTML = this.renderPodium(top3);

      const grupoAHTML = this.renderGrupoVacas(rankingA.slice(3), 'Vacas con partos', 4);
      const grupoBHTML = this.renderGrupoPreparto(grupoB);

      container.innerHTML = `
        <div class="rankings-view">
          ${headerHTML}
          ${this.tipoActual === 'vacas' ? this.renderIVMInfo() : ''}
          ${statsHTML}
          ${podiumHTML}
          ${grupoAHTML}
          ${grupoBHTML}
        </div>
      `;

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
          <p class="mb-2"><strong>IVM-P</strong> = para hembras sin partos, según edad y estado reproductivo.</p>
          <div class="ivm-blocks">
            <div class="ivm-block">
              <div class="ivm-block-header"><span class="ivm-block-num">1</span> Edad al primer parto <strong>15 pts</strong></div>
              <div class="ivm-block-detail">24-34m=15 · 35-40m=12 · 41-44m=8 · 45-48m=5 · +49m=2 · &lt;24m=revisar</div>
            </div>
            <div class="ivm-block">
              <div class="ivm-block-header"><span class="ivm-block-num">2</span> Intervalo entre partos <strong>25 pts</strong></div>
              <div class="ivm-block-detail">280-365d=25 · 366-420d=22.5 · 421-450d=20 · 451-480d=17.5 · 481-540d=12.5 · 541-600d=10 · 601-700d=5 · &gt;700d=0<br>
              <span class="text-danger">&lt;280d=revisar dato</span><br>
              <em>1 solo parto = 0 pts (sin historial para medir)</em></div>
            </div>
            <div class="ivm-block">
              <div class="ivm-block-header"><span class="ivm-block-num">3</span> Resultado de crías <strong>30 pts</strong></div>
              <div class="ivm-block-detail">Vendida=30 · Desarrollo=25.5 · Joven=21 · Muerta=0 · neonatal=-10<br>
              <span class="text-danger">2+ neonatales=-20 c/u</span><br>
            </div>
            <div class="ivm-block">
              <div class="ivm-block-header"><span class="ivm-block-num">4</span> Consistencia <strong>8 pts</strong></div>
              <div class="ivm-block-detail">1p preñada=4 · 1p vacía=2 · 2p=5 · 3p=7 · 4+p=8<br>
              <span class="text-danger">Penalizaciones:</span> alta variación IEP=-2 · 1 int &gt;600d=-2 · datos incompletos=-1</div>
            </div>
            <div class="ivm-block" style="border-left:3px solid #FFD700">
              <div class="ivm-block-header"><span class="ivm-block-num" style="background:#F57C00">+</span> Bono precocidad <strong>máx +5</strong></div>
              <div class="ivm-block-detail">1er parto ≤30m=<strong>+3</strong> · 31-34m=<strong>+2</strong> (incluso 1 solo parto)<br>
              Si mantiene ≥80% int ≤420d=<strong>+5</strong><br>
              Empezó tarde (+34m) pero mantuvo ritmo=<strong>+3</strong><br>
              <span class="text-danger">Inactividad: +365d=-1 · +500d=-3 · +720d=-5 · +900d=-10 · +3años=-40</span></em></div>
              <em>Limitado a +5 total. Ya no es ilimitado.</em></div>
            </div>
          </div>
          <div class="ivm-footer-info">
            <strong>Factor de confianza:</strong> 1 parto=×0.55 · 2=×0.75 · 3=×0.90 · 4+=×1.00<br>
            <strong>Fórmula:</strong> IVM bruto = Σ criterios 1-5 + bono → IVM final = 50 + confianza × (bruto − 50) → tope 0-100<br>
            <strong>Categorías:</strong> <span class="badge bg-warning text-dark">≥78 Élite</span> <span class="badge bg-success">≥68 Muy buena</span> <span class="badge bg-info">≥58 Buena</span> <span class="badge bg-secondary">≥50 Regular</span> <span class="badge bg-primary">40-49 Aceptable</span> <span class="badge bg-danger">&lt;40 Mala</span><br>
            <strong class="text-danger">⚠️ Reglas de descarte:</strong> 2+ crías muertas -30d o 2+ intervalos +700d → "Línea de descarte"<br>
            <strong>IVM-P (preparto):</strong> Hembras sin partos. Preñada joven &gt; vacía adulta. +48m vacía = línea de descarte.
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

  renderStatsBarToros(ranking) {
    if (!ranking.length) return '';
    const total = ranking.length;
    return `
      <div class="rankings-stats-bar">
        <div class="rankings-stat">
          <i class="fas fa-list-ol"></i>
          <span>Toros rankeados</span>
          <strong>${total}</strong>
        </div>
      </div>
    `;
  },

  renderGrupoVacas(items, titulo, startIndex = 1) {
    if (!items.length) return '';
    return `
      <div class="rankings-section-header">
        <h3>${titulo}</h3>
        <span class="badge bg-secondary ms-2">${items.length}</span>
      </div>
      <div class="ranking-cards">
        ${items.map((a, i) => {
          const rank = a.posicion || (startIndex + i);
          const fotoSrc = a.foto ? `/api/${a.foto}` : null;
          const scorePercent = Math.min(100, (a.ivm_final || 0));

          return `
            <div class="ranking-card visible cat-row-${this.categoryRowClass(a.categoria)}" onclick="RankingsView.verScorecard(${a.id})" style="animation-delay:${i * 0.05}s">
              <div class="ranking-card-rank"><span class="ranking-card-rank-num">${rank}</span></div>
              <div class="ranking-card-photo">
                ${fotoSrc
                  ? `<img src="${fotoSrc}" alt="${a.nombre}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
                     <div class="ranking-card-photo-fb"><i class="fas fa-paw"></i></div>`
                  : `<div class="ranking-card-photo-fb"><i class="fas fa-paw"></i></div>`
                }
              </div>
              <div class="ranking-card-body">
                <div class="ranking-card-header">
                  <h4 class="ranking-card-name">${this.escapeHTML(a.nombre)}</h4>
                  <div class="ranking-card-score">${a.ivm_final} <span>IVM</span></div>
                </div>
                <div class="ranking-card-bar">
                  <div class="ranking-card-bar-fill" style="width:${scorePercent}%"></div>
                </div>
                <div class="ranking-card-metrics">
                  <span class="badge ${this.categoryBadgeClass(a.categoria)}">${a.categoria || '-'}</span>
                  <span><i class="fas fa-calendar-check"></i>${a.cantidad_partos || 0} partos</span>
                  <span><i class="fas fa-clock"></i>IEP ${a.promedio_iep_dias || '-'}d</span>
                  ${a.alerta ? `<span class="text-danger"><i class="fas fa-exclamation-triangle"></i>${a.alerta}</span>` : ''}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  renderGrupoPreparto(items) {
    if (!items.length) return '';
    const ranking = this.invertido ? [...items].reverse() : items;
    return `
      <div class="rankings-section-header">
        <h3>Hembras Preparto <small class="text-muted">(sin partos)</small></h3>
        <span class="badge bg-info ms-2">${ranking.length}</span>
      </div>
      <div class="ranking-cards">
        ${ranking.map((a, i) => {
          const rank = a.posicion || (i + 1);
          const fotoSrc = a.foto ? `/api/${a.foto}` : null;
          return `
            <div class="ranking-card visible cat-row-${this.categoryRowClass(a.categoria)}" onclick="RankingsView.verScorecard(${a.id})" style="animation-delay:${i * 0.05}s">
              <div class="ranking-card-rank"><span class="ranking-card-rank-num">${rank}</span></div>
              <div class="ranking-card-photo">
                ${fotoSrc
                  ? `<img src="${fotoSrc}" alt="${a.nombre}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
                     <div class="ranking-card-photo-fb"><i class="fas fa-paw"></i></div>`
                  : `<div class="ranking-card-photo-fb"><i class="fas fa-paw"></i></div>`
                }
              </div>
              <div class="ranking-card-body">
                <div class="ranking-card-header">
                  <h4 class="ranking-card-name">${this.escapeHTML(a.nombre)}</h4>
                  <div class="ranking-card-score">${a.ivm_p ?? a.ivm_final ?? '-'} <span>IVM-P</span></div>
                </div>
                <div class="ranking-card-bar">
                  <div class="ranking-card-bar-fill" style="width:${Math.min(100, (a.ivm_p || 0))}%;background:var(--azul)"></div>
                </div>
                <div class="ranking-card-metrics">
                  <span class="badge ${this.categoryBadgeClass(a.categoria)}">${a.categoria || '-'}</span>
                  <span><i class="fas fa-venus"></i>${a.ivm_tipo || 'IVM-P'}</span>
                  ${a.alerta ? `<span class="text-danger"><i class="fas fa-exclamation-triangle"></i>${a.alerta}</span>` : ''}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  renderPodium(top3) {
    if (!top3.length) {
      return `<div class="rankings-empty"><i class="fas fa-chart-bar"></i><p>Sin datos suficientes para ranking</p></div>`;
    }

    // Layout visual clásico: 🥈 #2 — 🥇 #1 — 🥉 #3
    const podiumOrder = top3.length === 3
      ? [top3[1], top3[0], top3[2]]
      : top3.length === 2
        ? [null, top3[0], top3[1]]
        : [null, top3[0], null];

    const medals = ['silver', 'gold', 'bronze'];

    return `
      <div class="rankings-podium">
        ${podiumOrder.map((a, pos) => {
          if (!a) return '<div class="rankings-podium-card podium-empty"></div>';
          const fotoSrc = a.foto ? `/api/${a.foto}` : null;

          return `
            <div class="rankings-podium-card podium-${medals[pos]}" onclick="RankingsView.verScorecard(${a.id})">
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
                  <div class="podium-score-badge">⭐ ${a.ivm_final} IVM</div>
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
            <div class="ranking-card visible cat-row-${this.tipoActual === 'vacas' ? this.categoryRowClass(a.categoria) : this.toroCategoryClass(a.veredicto)}" onclick="RankingsView.verScorecard(${a.id})" style="animation-delay:${i * 0.05}s">
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
                    <span class="badge ${this.toroBadgeClass(a.veredicto)}">${a.veredicto || '-'}</span>
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
    const cat = categoria || '';
    if (cat.startsWith('Aceptable')) return 'cat-aceptable';
    if (cat.startsWith('Elite') || cat.includes('Élite')) return 'cat-elite';
    if (cat.startsWith('Muy buena')) return 'cat-muy-buena';
    if (cat.startsWith('Buena')) return 'cat-buena';
    if (cat.startsWith('Regular')) return 'cat-regular';
    if (cat.includes('revisar descarte') || cat.includes('Linea de descarte')) return 'cat-mala';
    if (cat.includes('Descarte')) return 'cat-descarte';
    if (cat.startsWith('Mala')) return 'cat-mala';
    return 'cat-regular';
  },

  categoryBadgeClass(categoria) {
    const cat = categoria || '';
    if (cat.startsWith('Aceptable')) return 'cat-badge cat-badge-aceptable';
    if (cat.startsWith('Elite') || cat.includes('Élite')) return 'cat-badge cat-badge-elite';
    if (cat.startsWith('Muy buena')) return 'cat-badge cat-badge-muy-buena';
    if (cat.startsWith('Buena')) return 'cat-badge cat-badge-buena';
    if (cat.startsWith('Regular')) return 'cat-badge cat-badge-regular';
    if (cat.includes('revisar descarte') || cat.includes('Linea de descarte')) return 'cat-badge cat-badge-mala';
    if (cat.includes('Descarte')) return 'cat-badge cat-badge-descarte';
    if (cat.startsWith('Mala')) return 'cat-badge cat-badge-mala';
    return 'cat-badge cat-badge-regular';
  },

  categoryRowClass(categoria) {
    const cat = categoria || '';
    if (cat.startsWith('Aceptable')) return 'aceptable';
    if (cat.startsWith('Elite') || cat.includes('Élite')) return 'elite';
    if (cat.startsWith('Muy buena')) return 'muy-buena';
    if (cat.startsWith('Buena')) return 'buena';
    if (cat.startsWith('Regular')) return 'regular';
    if (cat.includes('revisar descarte') || cat.includes('Linea de descarte')) return 'mala';
    if (cat.includes('Descarte')) return 'descarte';
    if (cat.startsWith('Mala')) return 'mala';
    return 'regular';
  },

  toroCategoryClass(veredicto) {
    if (!veredicto || typeof veredicto !== 'string') return 'regular';
    if (veredicto.startsWith('Buen')) return 'buena';
    if (veredicto.startsWith('Alerta')) return 'regular';
    if (veredicto.startsWith('Revisar')) return 'mala';
    return 'regular';
  },

  toroBadgeClass(veredicto) {
    if (!veredicto || typeof veredicto !== 'string') return 'cat-badge cat-badge-regular';
    if (veredicto.startsWith('Buen')) return 'cat-badge cat-badge-buena';
    if (veredicto.startsWith('Alerta')) return 'cat-badge cat-badge-regular';
    if (veredicto.startsWith('Revisar')) return 'cat-badge cat-badge-mala';
    return 'cat-badge cat-badge-regular';
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
