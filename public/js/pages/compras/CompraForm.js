const CompraFormPage = {
  _contadorFilas: 0,

  async render() {
    try {
      const { data: rebanos } = await API.get('/rebanos');

      return MainLayout.render(`
        <div class="page-header">
          <h1 class="page-title"><i class="fas fa-cart-shopping me-2"></i>Nueva Compra de Animales</h1>
          <button class="btn btn-outline-secondary" onclick="Router.navegar('/compras')"><i class="fas fa-arrow-left me-1"></i>Volver</button>
        </div>

        <form id="compra-form" onsubmit="CompraFormPage.guardar(event)">
          <div class="card mb-3">
            <div class="card-header"><strong><i class="fas fa-file-invoice me-2"></i>Datos de la Compra</strong></div>
            <div class="card-body">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Proveedor / Vendedor *</label>
                  <input type="text" class="form-control" id="compra-proveedor" placeholder="Nombre de quien te vendió" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Fecha de Compra *</label>
                  <input type="date" class="form-control" id="compra-fecha" value="${new Date().toISOString().substring(0, 10)}" required>
                </div>
              </div>
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Rebaño / Potrero de destino *</label>
                  ${(rebanos.data || []).length === 0 ? `
                    <div class="alert alert-warning mb-2">No hay rebaños activos. <a href="#" onclick="Router.navegar('/rebanos');return false">Creá uno primero</a></div>
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
                <div class="col-md-6">
                  <label class="form-label">Notas (opcional)</label>
                  <input type="text" class="form-control" id="compra-notas" placeholder="Lote, procedencia, etc.">
                </div>
              </div>
            </div>
          </div>

          <div class="card mb-3">
            <div class="card-header d-flex justify-content-between align-items-center">
              <strong><i class="fas fa-horse me-2"></i>Animales</strong>
              <button type="button" class="btn btn-sm btn-primary" onclick="CompraFormPage.agregarFila()"><i class="fas fa-plus me-1"></i>Agregar animal</button>
            </div>
            <div class="table-responsive">
              <table class="table table-bordered mb-0" id="animales-table">
                <thead class="table-light">
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
                <tbody id="animales-tbody"></tbody>
              </table>
            </div>
            <div class="card-body border-top pt-3">
              <div class="row g-3 align-items-end">
                <div class="col-auto">
                  <span class="fw-semibold">Total animales: <span id="total-animales">0</span></span>
                </div>
                <div class="col-auto">
                  <span class="fw-semibold">Costo total: <span id="total-costo">$0</span></span>
                </div>
              </div>
            </div>
          </div>

          <div class="d-flex gap-2 justify-content-end mb-4">
            <button type="button" class="btn btn-outline-secondary" onclick="Router.navegar('/compras')">Cancelar</button>
            <button type="submit" class="btn btn-primary" id="btn-guardar-compra">
              <i class="fas fa-floppy-disk me-1"></i>Registrar Compra
            </button>
          </div>
        </form>
      `);
    } catch (e) {
      return MainLayout.render(`<div class="alert alert-danger">Error: ${e.message}</div>`);
    }
  },

  afterRender() {
    this.agregarFila();
  },

  agregarFila() {
    const tbody = document.getElementById('animales-tbody');
    if (!tbody) return;

    this._contadorFilas++;
    const idx = this._contadorFilas;
    const hoy = new Date().toISOString().substring(0, 10);

    const tr = document.createElement('tr');
    tr.id = `animal-fila-${idx}`;
    tr.innerHTML = `
      <td><input type="text" class="form-control form-control-sm" id="animal-nombre-${idx}" placeholder="Ej: Toro Brahma" required></td>
      <td>
        <select class="form-select form-select-sm" id="animal-sexo-${idx}" required onchange="CompraFormPage.calcularEtapa(${idx})">
          <option value="">...</option>
          <option value="Macho">Macho</option>
          <option value="Hembra">Hembra</option>
        </select>
      </td>
      <td><input type="text" class="form-control form-control-sm" id="animal-identificacion-${idx}" placeholder="Arete/caravana"></td>
      <td><input type="date" class="form-control form-control-sm" id="animal-fecha-${idx}" value="${hoy}" required onchange="CompraFormPage.calcularEtapa(${idx})"></td>
      <td><input type="text" class="form-control form-control-sm" id="animal-etapa-${idx}" readonly value="Ternero" style="background:#f5f5f5;font-weight:600"></td>
      <td><input type="number" step="0.01" min="0" class="form-control form-control-sm" id="animal-peso-${idx}" placeholder="Kg" onchange="CompraFormPage.actualizarTotales()"></td>
      <td><input type="number" step="1" min="0" class="form-control form-control-sm" id="animal-precio-${idx}" placeholder="$" onchange="CompraFormPage.actualizarTotales()"></td>
      <td><button type="button" class="btn btn-outline-danger btn-sm" onclick="CompraFormPage.eliminarFila(${idx})" title="Quitar animal"><i class="fas fa-times"></i></button></td>
    `;

    tbody.appendChild(tr);
    this.actualizarTotales();
  },

  eliminarFila(idx) {
    const fila = document.getElementById(`animal-fila-${idx}`);
    if (fila) {
      fila.remove();
      this.actualizarTotales();
    }
  },

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

  async guardar(e) {
    e.preventDefault();

    const proveedor = document.getElementById('compra-proveedor').value.trim();
    const fechaCompra = document.getElementById('compra-fecha').value;
    const rebanoSelect = document.getElementById('compra-rebano');
    const notas = document.getElementById('compra-notas').value.trim();

    if (!proveedor) { Toast.warning('Ingresá el proveedor'); return; }
    if (!rebanoSelect || !rebanoSelect.value) { Toast.warning('Seleccioná el rebaño de destino'); return; }

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

      if (!nombre) { Toast.warning(`Completá el nombre del animal en la fila #${id}`); return; }
      if (!sexo) { Toast.warning(`Seleccioná el sexo del animal "${nombre}"`); return; }
      if (!fechaNac) { Toast.warning(`Completá la fecha de nacimiento de "${nombre}"`); return; }

      animales.push({
        nombre, sexo,
        identificacion: identificacion || null,
        fecha_nacimiento: fechaNac,
        peso_entrada: peso ? parseFloat(peso) : null,
        precio_compra: precio ? parseFloat(precio) : null,
      });
    }

    if (animales.length === 0) {
      Toast.warning('Agregá al menos un animal a la compra');
      return;
    }

    const btn = document.getElementById('btn-guardar-compra');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Guardando...'; }

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
      Toast.error(err.response?.data?.error || 'Error al registrar la compra');
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-floppy-disk me-1"></i>Registrar Compra'; }
    }
  },
};

