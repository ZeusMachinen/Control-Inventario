/**
 * Página: Timeline de Reproducción
 * Muestra todos los eventos reproductivos agrupados por animal.
 * Botones de acceso rápido para registrar cada tipo de evento.
 */
const ReproduccionPage = {
  async render() {
    try {
      // Fetch all event types in parallel
      const [celosRes, serviciosRes, diagRes, partosRes] = await Promise.all([
        API.get('/reproduccion/celos'),
        API.get('/reproduccion/servicios'),
        API.get('/reproduccion/diagnosticos-gestacion'),
        API.get('/reproduccion/partos'),
      ]);

      const celos = celosRes.data?.data || [];
      const servicios = serviciosRes.data?.data || [];
      const diagnosticos = diagRes.data?.data || [];
      const partos = partosRes.data?.data || [];

      // Group events by animal
      const porAnimal = {};

      celos.forEach(c => {
        const key = c.animal_id;
        if (!porAnimal[key]) porAnimal[key] = { animal_id: key, animal_nombre: c.animal_nombre, eventos: [] };
        porAnimal[key].eventos.push({ ...c, tipo: 'celo', fecha: c.fecha_inicio, label: 'Diagnóstico de Celo' });
      });

      servicios.forEach(s => {
        const key = s.animal_id;
        if (!porAnimal[key]) porAnimal[key] = { animal_id: key, animal_nombre: s.animal_nombre, eventos: [] };
        porAnimal[key].eventos.push({ ...s, tipo: 'servicio', label: 'Servicio' });
      });

      diagnosticos.forEach(d => {
        const key = d.animal_id;
        if (!porAnimal[key]) porAnimal[key] = { animal_id: key, animal_nombre: d.animal_nombre, eventos: [] };
        porAnimal[key].eventos.push({ ...d, tipo: 'diagnostico', label: 'Diagnóstico de Gestación' });
      });

      partos.forEach(p => {
        const key = p.animal_id;
        if (!porAnimal[key]) porAnimal[key] = { animal_id: key, animal_nombre: p.animal_nombre, eventos: [] };
        porAnimal[key].eventos.push({ ...p, tipo: 'parto', label: 'Parto' });
      });

      // Sort eventos within each animal by fecha
      Object.values(porAnimal).forEach(grupo => {
        grupo.eventos.sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
      });

      // Convert to sorted array (by latest event date)
      const grupos = Object.values(porAnimal).sort((a, b) => {
        const aLast = a.eventos[a.eventos.length - 1]?.fecha || '';
        const bLast = b.eventos[b.eventos.length - 1]?.fecha || '';
        return bLast.localeCompare(aLast);
      });

      const totalEventos = celos.length + servicios.length + diagnosticos.length + partos.length;

      return MainLayout.render(`
        <div class="page-header">
          <h1 class="page-title">🔄 Reproducción</h1>
          <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
            <button class="btn btn-primary" onclick="Router.navegar('/reproduccion/celos/nuevo')">
              + Diagnóstico Celo
            </button>
            <button class="btn btn-primary" onclick="Router.navegar('/reproduccion/servicios/nuevo')">
              + Servicio
            </button>
            <button class="btn btn-primary" onclick="Router.navegar('/reproduccion/diagnosticos/nuevo')">
              + Diagnóstico Gestación
            </button>
            <button class="btn btn-primary" onclick="Router.navegar('/reproduccion/partos/nuevo')">
              + Parto
            </button>
          </div>
        </div>

        <div class="stats-grid" style="margin-bottom:1rem">
          <div class="stat-card">
            <div class="stat-card-info">
              <h3>${totalEventos}</h3>
              <p>Total Eventos</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-card-info">
              <h3>${celos.length}</h3>
              <p>Diagnósticos Celo</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-card-info">
              <h3>${servicios.length}</h3>
              <p>Servicios</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-card-info">
              <h3>${partos.length}</h3>
              <p>Partos</p>
            </div>
          </div>
        </div>

        <div id="timeline-container">
          ${grupos.length === 0 ? `
            <div class="card">
              <div class="card-body">
                <p class="empty-state">No hay eventos reproductivos registrados.
                  Use los botones superiores para registrar el primer evento.</p>
              </div>
            </div>
          ` : `
            ${grupos.map(grupo => `
              <div class="card" style="margin-bottom:1rem">
                <div class="card-header">
                  <strong>${grupo.animal_nombre}</strong>
                  <span class="badge badge-azul">${grupo.eventos.length} evento${grupo.eventos.length !== 1 ? 's' : ''}</span>
                </div>
                <div class="card-body">
                  <div class="timeline">
                    ${grupo.eventos.map((ev, i) => `
                      <div class="timeline-item" style="
                        display:flex;gap:0.75rem;padding:0.5rem 0;
                        ${i < grupo.eventos.length - 1 ? 'border-bottom:1px solid var(--gris-borde);' : ''}
                      ">
                        <div style="min-width:100px;font-size:0.85rem;color:var(--gris-texto)">
                          ${DateUtil.formatear(ev.fecha)}
                        </div>
                        <div style="min-width:40px;text-align:center">
                          ${ev.tipo === 'celo' ? '🔍' : ''}
                          ${ev.tipo === 'servicio' ? '🤝' : ''}
                          ${ev.tipo === 'diagnostico' ? '🩺' : ''}
                          ${ev.tipo === 'parto' ? '🍼' : ''}
                        </div>
                        <div style="flex:1">
                          <strong>${ev.label}</strong>
                          ${ev.subtipo ? `<br><span style="font-size:0.85rem">${ev.subtipo}</span>` : ''}
                          ${ev.resultado ? `<br><span class="badge ${ev.resultado === 'Positivo' ? 'badge-verde' : 'badge-naranja'}">${ev.resultado}</span>` : ''}
                          ${ev.tipo === 'parto' && ev.crias ? `<br><span style="font-size:0.85rem">${Array.isArray(ev.crias) ? ev.crias.length + ' cría(s)' : 'Con crías'}</span>` : ''}
                          ${ev.observaciones ? `<br><span style="font-size:0.8rem;color:var(--gris-texto)">${ev.observaciones}</span>` : ''}
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              </div>
            `).join('')}
          `}
        </div>
      `);
    } catch (e) {
      return MainLayout.render(`<div class="alert alert-danger">Error: ${e.message}</div>`);
    }
  },
};
