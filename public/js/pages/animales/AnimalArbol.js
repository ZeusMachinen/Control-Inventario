/**
 * Página: Árbol Genealógico (vista completa)
 */
const AnimalArbolPage = {
  async render(params) {
    const id = params?.id;
    if (!id) return MainLayout.render(`<div class="alert alert-danger">ID de animal no especificado</div>`);

    try {
      const { data: res } = await API.get(`/animales/${id}/arbol-genealogico`);
      const d = res?.data || {};
      const a = d?.animal || {};

      return MainLayout.render(`
        <style>
          .arbol-wrapper { overflow-x:auto; padding-bottom:0.5rem; }
          .arbol-container { display:flex; flex-direction:column; align-items:center; gap:0; padding:1rem 2rem; min-width:max-content; }
          .arbol-nivel { display:flex; justify-content:center; align-items:flex-start; gap:1.5rem; flex-wrap:nowrap; }
          .arbol-nivel-doble { display:flex; align-items:flex-start; gap:0.25rem; }
          .arbol-conector-v { width:2px; height:30px; background:#adb5bd; margin:4px auto; }
          .arbol-conector-h-container { display:flex; align-items:center; min-width:20px; }
          .arbol-conector-h { height:2px; flex:1; background:#adb5bd; min-width:20px; }
          .arbol-col-hijo { display:flex; flex-direction:column; align-items:center; min-width:140px; }
          .arbol-card { min-width:130px; transition:transform 0.15s; }
          .arbol-card:hover { transform:scale(1.05); }
          .arbol-card-null { min-width:130px; border:1px dashed #adb5bd; background:#f8f9fa; }
          .arbol-actual { min-width:150px; border:3px solid #198754 !important; }
        </style>

        <div class="page-header">
          <h1 class="page-title"><i class="fas fa-tree text-success me-2"></i>Árbol Genealógico — ${a.nombre || 'Animal #' + id}</h1>
          <div class="d-flex gap-2">
            <button class="btn btn-outline-primary" onclick="Router.navegar('/animales/${a.id || id}')">
              <i class="fas fa-arrow-left"></i> Volver al detalle
            </button>
            <button class="btn btn-outline-secondary" onclick="Router.navegar('/animales')">
              <i class="fas fa-list"></i> Lista de animales
            </button>
          </div>
        </div>

        <div class="card">
          <div class="card-body p-0">
            <div class="arbol-wrapper" id="arbol-wrapper">
              ${this.renderArbol(d)}
            </div>
          </div>
        </div>
      `);
    } catch (e) {
      return MainLayout.render(`
        <div class="page-header">
          <h1 class="page-title"><i class="fas fa-tree text-success me-2"></i>Árbol Genealógico</h1>
          <div class="d-flex gap-2">
            <button class="btn btn-outline-primary" onclick="Router.navegar('/animales/${id}')">
              <i class="fas fa-arrow-left"></i> Volver al detalle
            </button>
            <button class="btn btn-outline-secondary" onclick="Router.navegar('/animales')">
              <i class="fas fa-list"></i> Lista de animales
            </button>
          </div>
        </div>
        <div class="alert alert-danger"><i class="fas fa-exclamation-triangle me-2"></i>Error al cargar árbol genealógico: ${e.message}</div>
      `);
    }
  },

  afterRender() {
    // Centrar el scroll horizontal en el animal actual
    const wrapper = document.getElementById('arbol-wrapper');
    const actual = document.querySelector('.arbol-actual');
    if (wrapper && actual) {
      const wrapperWidth = wrapper.clientWidth;
      const cardLeft = actual.offsetLeft;
      const cardWidth = actual.offsetWidth;
      wrapper.scrollLeft = cardLeft - (wrapperWidth / 2) + (cardWidth / 2);
    }
  },

  renderArbol(d) {
    const { animal, padres, abuelos, hijos, nietos, hermanos, sobrinos, stats } = d || {};

    const card = (a, label) => {
      if (!a) {
        return `<div class="d-flex flex-column align-items-center">
          <div class="card arbol-card-null text-center p-3">
            <div class="text-secondary"><i class="fas fa-question-circle fa-2x"></i></div>
            <div class="small text-secondary mt-1">— No registrado</div>
          </div>
          ${label ? `<div class="small text-secondary mt-1">${label}</div>` : ''}
        </div>`;
      }

      const inactivo = a.estado_general === 'Muerto' || a.estado_general === 'Vendido';
      const claseEstado = inactivo ? 'bg-secondary text-white opacity-75' : '';
      const icono = a.sexo === 'Hembra' ? 'fa-venus text-danger' : 'fa-mars text-primary';
      const txtColor = claseEstado ? 'color:white' : '';

      return `<a href="#/animales/${a.id}" class="text-decoration-none d-flex flex-column align-items-center">
        <div class="card arbol-card text-center p-3 ${claseEstado}" style="${txtColor}">
          <div style="font-size:1.8rem"><i class="fas ${icono}"></i></div>
          <div class="fw-semibold mt-1">${a.nombre}</div>
          <div class="mt-1">
            <span class="badge bg-primary" style="font-size:0.65rem">${a.etapa}</span>
            <span class="badge ${inactivo ? 'bg-dark' : 'bg-success'}" style="font-size:0.6rem">${a.estado_general}</span>
          </div>
        </div>
        ${label ? `<div class="small text-secondary mt-1">${label}</div>` : ''}
      </a>`;
    };

    const nivelDoble = (izq, der, labelIzq, labelDer) => `
      <div class="arbol-nivel-doble">
        ${card(izq, labelIzq)}
        <div class="arbol-conector-h-container">
          <div class="arbol-conector-h"></div>
        </div>
        ${card(der, labelDer)}
      </div>
    `;

    let html = '<div class="arbol-container">';

    // Abuelos
    const tieneAbuelos = abuelos?.maternos || abuelos?.paternos;
    if (tieneAbuelos) {
      html += '<div class="arbol-nivel">';
      html += nivelDoble(
        abuelos?.maternos?.madre, abuelos?.maternos?.padre,
        'Abuela Materna', 'Abuelo Materno'
      );
      html += '<div class="arbol-conector-h-container"><div class="arbol-conector-h"></div></div>';
      html += nivelDoble(
        abuelos?.paternos?.madre, abuelos?.paternos?.padre,
        'Abuela Paterna', 'Abuelo Paterno'
      );
      html += '</div>';
      html += '<div class="arbol-conector-v"></div>';
    }

    // Padres
    if (padres?.madre || padres?.padre) {
      html += '<div class="arbol-nivel">';
      html += nivelDoble(padres.madre, padres.padre, 'Madre', 'Padre');
      html += '</div>';
      html += '<div class="arbol-conector-v"></div>';
    }

    // Animal actual + Hermanos (mismo nivel, cada uno con sus descendientes)
    if (animal) {
      html += '<div class="arbol-nivel mb-2">';

      // Hermanos (cada uno con sus sobrinos debajo)
      (hermanos || []).forEach(h => {
        html += '<div class="arbol-col-hijo">';
        html += card(h, 'Hermano');
        const hijosHermano = (sobrinos && sobrinos[h.id]) || [];
        if (hijosHermano.length > 0) {
          html += '<div class="arbol-conector-v"></div>';
          hijosHermano.forEach(s => {
            html += card(s, 'Sobrino');
          });
        }
        html += '</div>';
      });

      // Animal actual (destacado, sin hijos debajo — van en su propia fila)
      html += '<div class="arbol-col-hijo">';
      html += `
        <a href="#/animales/${animal.id}" class="text-decoration-none d-flex flex-column align-items-center">
          <div class="card arbol-card arbol-actual text-center p-3">
            <div style="font-size:2.2rem"><i class="fas ${animal.sexo === 'Hembra' ? 'fa-venus text-danger' : 'fa-mars text-primary'}"></i></div>
            <div class="fw-bold mt-1">${animal.nombre}</div>
            <div class="mt-1">
              <span class="badge bg-primary">${animal.etapa}</span>
              <span class="badge ${animal.estado_general === 'Muerto' || animal.estado_general === 'Vendido' ? 'bg-dark' : 'bg-success'}">${animal.estado_general}</span>
            </div>
          </div>
          <div class="small text-success fw-semibold mt-1">Actual</div>
        </a>`;
      html += '</div>';

      html += '</div>'; // cierra arbol-nivel (hermanos + animal)

      // Hijos del animal actual — en su propia fila horizontal
      if (hijos && hijos.length > 0) {
        html += '<div class="arbol-conector-v"></div>';
        html += '<div class="arbol-nivel">';
        hijos.forEach(h => {
          html += '<div class="arbol-col-hijo">';
          html += card(h, 'Hijo');

          // Nietos (hijos de este hijo)
          const nietosDeEste = (nietos && nietos[h.id]) || [];
          if (nietosDeEste.length > 0) {
            html += '<div class="arbol-conector-v"></div>';
            nietosDeEste.forEach(n => {
              html += card(n, 'Nieto');
            });
          }
          html += '</div>';
        });
        html += '</div>'; // cierra arbol-nivel (hijos)
      }
    }

    // Stats
    const sinRelaciones = !stats?.total_hijos && !stats?.total_hermanos && !stats?.total_sobrinos && !stats?.total_nietos;
    html += `<div class="text-center mt-4 text-secondary small border-top pt-3" style="width:100%;max-width:500px">
      ${stats?.total_hijos > 0 ? `<span class="me-3"><i class="fas fa-paw me-1"></i>${stats.total_hijos} hijo(s)</span>` : ''}
      ${stats?.total_nietos > 0 ? `<span class="me-3"><i class="fas fa-seedling me-1"></i>${stats.total_nietos} nieto(s)</span>` : ''}
      ${stats?.total_hermanos > 0 ? `<span class="me-3"><i class="fas fa-users me-1"></i>${stats.total_hermanos} hermano(s)</span>` : ''}
      ${stats?.total_sobrinos > 0 ? `<span><i class="fas fa-child me-1"></i>${stats.total_sobrinos} sobrino(s)</span>` : ''}
      ${sinRelaciones ? 'Sin relaciones registradas' : ''}
    </div>`;

    html += '</div>';
    return html;
  },
};
