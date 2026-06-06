/**
 * Página: Formulario de Compra por Lote
 * Permite registrar múltiples animales comprados en una sola operación.
 */
const CompraFormPage = {
  /** Contador interno para IDs únicos de filas de animales */
  _contadorFilas: 0,

  async render() {
    try {
      const { data: rebanos } = await API.get('/rebanos');

      return MainLayout.render(`
        <div class="page-header">
          <h1 class="page-title">📥 Nueva Compra de Animales</h1>
          <button class="btn btn-secondary" onclick="Router.navegar('/compras')">← Volver</button>
        </div>

        <form id="compra-form" onsubmit="CompraFormPage.guardar(event)">
          <!-- ─── Datos del lote ─── -->
          <div class="card" style="margin-bottom:1rem">
            <div class="card-header"><strong>Datos de la Compra</strong></div>
            <div class="card-body">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Proveedor / Vendedor *</label>
                  <input type="text" class="form-input" id="compra-proveedor"
                    placeholder="Nombre de quien te vendió" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Fecha de Compra *</label>
                  <input type="date" class="form-input" id="compra-fecha"
                    value="${new Date().toISOString().substring(0, 10)}" required>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Rebaño / Potrero de destino *</label>
                  ${(rebanos.data || []).length === 0 ? `
                    <div class="alert alert-warning" style="margin-bottom:0.5rem">
                      No hay rebaños activos. <a href="#" onclick="Router.navegar('/rebanos');return false">Creá uno primero</a>
                    </div>
                    <select class="form-select" id="compra-rebano" disabled>
                      <option value="">— Creá un rebaño primero —</option>
                    </select>
                  ` : `
                    <select class="form-select" id="compra-rebano" required>
                      <option value="">Seleccione rebaño...</option>
                      ${(rebanos.data || []).map(r => `
                        <option value="${r.id}">${r.nombre}</option>
                      `).join('')}
                    </select>
                  `}
                </div>
                <div class="form-group">
                  <label class="form-label">Notas (opcional)</label>
                  <input type="text" class="form-input" id="compra-notas"
                    placeholder="Lote, procedencia, etc.">
                </div>
              </div>
            </div>
          </div>

          <!-- ─── Animales ─── -->
          <div class="card" style="margin-bottom:1rem">
            <div class="card-header">
              <strong>Animales</strong>
              <button type="button" class="btn btn-sm btn-primary" onclick="CompraFormPage.agregarFila()">
                + Agregar animal
              </button>
            </div>
            <div class="table-container">
              <table id="animales-table">
                <thead>
                  <tr>
                    <th style="min-width:140px">Nombre *</th>
                    <th style="min-width:100px">Sexo *</th>
                    <th style="min-width:100px">Identificación</th>
                    <th style="min-width:130px">Fecha Nac. *</th>
                    <th style="min-width:80px">Etapa</th>
                    <th style="min-width:90px">Peso (kg)</th>
                    <th style="min-width:110px">Precio Unit.</th>
                    <th style="width:40px"></th>
                  </tr>
                </thead>
                <tbody id="animales-tbody">
                  <!-- Se insertan filas dinámicamente -->
                </tbody>
              </table>
            </div>
            <div class="card-body" style="border-top:1px solid var(--border);padding-top:0.75rem">
              <div class="form-row" style="align-items:end">
                <div class="form-group">
                  <label class="form-label" style="font-size:0.85rem;font-weight:600">Total animales: <span id="total-animales">0</span></label>
                </div>
                <div class="form-group">
                  <label class="form-label" style="font-size:0.85rem;font-weight:600">Costo total: <span id="total-costo">$0</span></label>
                </div>
              </div>
            </div>
          </div>

          <div style="display:flex;gap:0.5rem;justify-content:flex-end;margin-bottom:2rem">
            <button type="button" class="btn btn-secondary" onclick="Router.navegar('/compras')">Cancelar</button>
            <button type="submit" class="btn btn-primary" id="btn-guardar-compra">
              💾 Registrar Compra
            </button>
          </div>
        </form>
      `);
    } catch (e) {
      return MainLayout.render(`<div class="alert alert-danger">Error: ${e.message}</div>`);
    }
  },

  afterRender() {
    // Agregar primera fila de animal
    this.agregarFila();
  },

  /**
   * Agrega una fila de animal al formulario.
   */
  agregarFila() {
    const tbody = document.getElementById('animales-tbody');
    if (!tbody) return;

    this._contadorFilas++;
    const idx = this._contadorFilas;
    const hoy = new Date().toISOString().substring(0, 10);

    const tr = document.createElement('tr');
    tr.id = `animal-fila-${idx}`;
    tr.innerHTML = `
      <td>
        <input type="text" class="form-input" id="animal-nombre-${idx}"
          placeholder="Ej: Toro Brahma" required style="width:100%">
      </td>
      <td>
        <select class="form-select" id="animal-sexo-${idx}" required
          onchange="CompraFormPage.calcularEtapa(${idx})" style="width:100%">
          <option value="">...</option>
          <option value="Macho">Macho</option>
          <option value="Hembra">Hembra</option>
        </select>
      </td>
      <td>
        <input type="text" class="form-input" id="animal-identificacion-${idx}"
          placeholder="Arete/caravana" style="width:100%">
      </td>
      <td>
        <input type="date" class="form-input" id="animal-fecha-${idx}"
          value="${hoy}" required onchange="CompraFormPage.calcularEtapa(${idx})" style="width:100%">
      </td>
      <td>
        <input type="text" class="form-input" id="animal-etapa-${idx}" readonly
          value="Ternero" style="background:#f5f5f5;font-weight:600;width:100%">
      </td>
      <td>
        <input type="number" step="0.01" min="0" class="form-input" id="animal-peso-${idx}"
          placeholder="Kg" onchange="CompraFormPage.actualizarTotales()" style="width:100%">
      </td>
      <td>
        <input type="number" step="1" min="0" class="form-input" id="animal-precio-${idx}"
          placeholder="$" onchange="CompraFormPage.actualizarTotales()" style="width:100%">
      </td>
      <td>
        <button type="button" class="btn btn-sm btn-danger" onclick="CompraFormPage.eliminarFila(${idx})"
          title="Quitar animal" style="padding:4px 8px">✕</button>
      </td>
    `;

    tbody.appendChild(tr);
    this.actualizarTotales();
  },

  /**
   * Elimina una fila de animal.
   */
  eliminarFila(idx) {
    const fila = document.getElementById(`animal-fila-${idx}`);
    if (fila) {
      fila.remove();
      this.actualizarTotales();
    }
  },

  /**
   * Calcula la etapa del animal automáticamente según fecha de nacimiento.
   */
  calcularEtapa(idx) {
    const fechaInput = document.getElementById(`animal-fecha-${idx}`);
    const etapaInput = document.getElementById(`animal-etapa-${idx}`);
    if (!fechaInput || !etapaInput) return;

    const fecha = fechaInput.value;
    if (!fecha) {
      etapaInput.value = '—';
      return;
    }
    const { totalMeses } = DateUtil.calcularEdad(fecha);
    etapaInput.value = DateUtil.determinarEtapa(totalMeses);
  },

  /**
   * Recalcula total de animales y costo total.
   */
  actualizarTotales() {
    const tbody = document.getElementById('animales-tbody');
    if (!tbody) return;

    const filas = tbody.querySelectorAll('tr');
    const totalSpan = document.getElementById('total-animales');
    const costoSpan = document.getElementById('total-costo');

    if (totalSpan) totalSpan.textContent = filas.length;

    if (costoSpan) {
      let total = 0;
      filas.forEach(tr => {
        const id = tr.id.replace('animal-fila-', '');
        const precioInput = document.getElementById(`animal-precio-${id}`);
        if (precioInput) {
          total += parseFloat(precioInput.value) || 0;
        }
      });
      costoSpan.textContent = Formateador.moneda(total);
    }
  },

  /**
   * Guarda la compra con todos los animales.
   */
  async guardar(e) {
    e.preventDefault();

    const proveedor = document.getElementById('compra-proveedor').value.trim();
    const fechaCompra = document.getElementById('compra-fecha').value;
    const rebanoSelect = document.getElementById('compra-rebano');
    const notas = document.getElementById('compra-notas').value.trim();

    if (!proveedor) { alert('Ingresá el proveedor'); return; }
    if (!rebanoSelect || !rebanoSelect.value) { alert('Seleccioná el rebaño de destino'); return; }

    const tbody = document.getElementById('animales-tbody');
    const filas = tbody.querySelectorAll('tr');
    const animales = [];

    for (const tr of filas) {
      const id = tr.id.replace('animal-fila-', '');

      const nombre = document.getElementById(`animal-nombre-${id}`)?.value.trim();
      const sexo = document.getElementById(`animal-sexo-${id}`)?.value;
      const fechaNac = document.getElementById(`animal-fecha-${id}`)?.value;
      const peso = document.getElementById(`animal-peso-${id}`)?.value;
      const precio = document.getElementById(`animal-precio-${id}`)?.value;
      const identificacion = document.getElementById(`animal-identificacion-${id}`)?.value.trim();

      if (!nombre) { alert(`Completá el nombre del animal en la fila #${id}`); return; }
      if (!sexo) { alert(`Seleccioná el sexo del animal "${nombre}"`); return; }
      if (!fechaNac) { alert(`Completá la fecha de nacimiento de "${nombre}"`); return; }

      animales.push({
        nombre,
        sexo,
        identificacion: identificacion || null,
        fecha_nacimiento: fechaNac,
        peso_entrada: peso ? parseFloat(peso) : null,
        precio_compra: precio ? parseFloat(precio) : null,
      });
    }

    if (animales.length === 0) {
      alert('Agregá al menos un animal a la compra');
      return;
    }

    const btn = document.getElementById('btn-guardar-compra');
    if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }

    try {
      await API.post('/compras', {
        proveedor,
        fecha_compra: fechaCompra,
        rebano_id: parseInt(rebanoSelect.value),
        notas: notas || null,
        animales,
      });

      Router.navegar('/compras');
    } catch (err) {
      alert(err.response?.data?.error || 'Error al registrar la compra');
      if (btn) { btn.disabled = false; btn.textContent = '💾 Registrar Compra'; }
    }
  },
};
