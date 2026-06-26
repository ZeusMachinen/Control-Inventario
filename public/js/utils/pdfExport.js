/**
 * PDFExport — Motor de exportación PDF reutilizable
 *
 * API declarativa para generar PDFs profesionales desde el cliente.
 * Captura gráficos (html2canvas + fallback Plotly.toImage), renderiza
 * tablas con jspdf-autotable, incluye logo y metadata.
 *
 * Dependencias (cargadas lazy, CDN con fallback a vendor/ local):
 *   - jsPDF 2.5.1
 *   - html2canvas 1.4.1
 *   - jspdf-autotable 3.8.x
 */
const PDFExport = {
  // Estado interno
  _doc: null,
  _config: {},
  _depsLoaded: false,
  _loadedScripts: new Set(),

  // URLs de CDN (intentadas primero — más rápido, browser cache)
  CDN: {
    jspdf:      'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    html2canvas:'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
    autotable:  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.3/jspdf.plugin.autotable.min.js',
  },

  // Rutas locales (fallback offline)
  LOCAL: {
    html2canvas: 'vendor/html2canvas.min.js',
    autotable:   'vendor/jspdf-autotable.min.js',
  },

  // ========================================================================
  // DEPENDENCY LOADER
  // ========================================================================

  /**
   * Carga un script con estrategia CDN→local y timeout de 5s.
   * @param {string} name — nombre lógico (para dedupe y logs)
   * @param {string} cdnUrl — URL CDN
   * @param {string} [localPath] — ruta local fallback (opcional)
   * @returns {Promise<void>}
   */
  _loadScript(name, cdnUrl, localPath) {
    if (this._loadedScripts.has(name)) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const tryLoad = (url, isLocal) => {
        const script = document.createElement('script');
        script.src = url;
        script.async = false;

        const timeout = setTimeout(() => {
          script.onload = null;
          script.onerror = null;
          script.remove();
          if (!isLocal && localPath) {
            // CDN tardó más de 5s → intentar local
            console.warn(`[PDFExport] ${name} CDN timeout, intentando local: ${localPath}`);
            tryLoad(localPath, true);
          } else {
            this._handleLoadError(name, reject, isLocal ? 'local' : 'CDN');
          }
        }, 5000);

        script.onload = () => {
          clearTimeout(timeout);
          this._loadedScripts.add(name);
          resolve();
        };

        script.onerror = () => {
          clearTimeout(timeout);
          script.remove();
          if (!isLocal && localPath) {
            console.warn(`[PDFExport] ${name} CDN error, intentando local: ${localPath}`);
            tryLoad(localPath, true);
          } else {
            this._handleLoadError(name, reject, isLocal ? 'local' : 'CDN');
          }
        };

        document.head.appendChild(script);
      };

      tryLoad(cdnUrl, false);
    });
  },

  _handleLoadError(name, reject, source) {
    const msg = `No se pudo cargar ${name} (${source})`;
    console.error(`[PDFExport] ${msg}`);
    if (window.Toast && typeof window.Toast.error === 'function') {
      window.Toast.error('No se pudieron cargar las librerías de PDF', 'Error de exportación');
    }
    reject(new Error(msg));
  },

  /**
   * Asegura que jsPDF, html2canvas y jspdf-autotable estén disponibles.
   * Idempotente: solo carga lo que falte.
   */
  async _ensureDeps() {
    // jsPDF: si ya está cargado por código previo, no recargar
    if (!window.jspdf || !window.jspdf.jsPDF) {
      await this._loadScript('jspdf', this.CDN.jspdf);
    }
    // html2canvas y autotable: siempre vía _loadScript (CDN → vendor)
    if (typeof window.html2canvas !== 'function') {
      await this._loadScript('html2canvas', this.CDN.html2canvas, this.LOCAL.html2canvas);
    }
    if (!window.jspdf || !window.jspdf.jsPDF.prototype.autoTable) {
      await this._loadScript('jspdf-autotable', this.CDN.autotable, this.LOCAL.autotable);
    }
    this._depsLoaded = true;
  },

  // ========================================================================
  // BUILDER API
  // ========================================================================

  /**
   * Crea un nuevo documento PDF.
   * @param {Object} config
   * @param {string} [config.title] — título del documento
   * @param {'portrait'|'landscape'} [config.orientation='portrait']
   * @param {boolean} [config.logo=true]
   * @param {string} [config.userName] — se muestra en el footer
   * @param {string} [config.filters] — descripción de filtros aplicados
   */
  create(config = {}) {
    this._config = {
      title: config.title || 'Reporte',
      orientation: config.orientation || 'portrait',
      logo: config.logo !== false,
      userName: config.userName || null,
      filters: config.filters || null,
    };
    this._currentY = 20;
    this._doc = null; // se crea lazy en save() o al primer addSection que lo necesite
    return this;
  },

  /**
   * Asegura que el doc esté creado. Llamar antes de cualquier addSection.
   */
  _ensureDoc() {
    if (this._doc) return;
    if (!window.jspdf || !window.jspdf.jsPDF) {
      throw new Error('[PDFExport] jsPDF no está cargado. Llama a save() o _ensureDeps() primero.');
    }
    const { jsPDF } = window.jspdf;
    this._doc = new jsPDF({
      orientation: this._config.orientation,
      unit: 'mm',
      format: 'a4',
    });
    this._doc.setFont('helvetica');
    if (this._config.logo) {
      this._drawLogo();
    }
  },

  /**
   * Agrega una sección al PDF.
   * @param {{type: string, data: Object}} section
   * @returns {this}
   */
  addSection(section) {
    this._ensureDoc();
    if (!section || !section.type) {
      console.warn('[PDFExport] addSection sin type, ignorando');
      return this;
    }
    const handler = this._sectionHandlers[section.type];
    if (!handler) {
      console.warn(`[PDFExport] Tipo de sección desconocido: ${section.type}`);
      return this;
    }
    handler.call(this, section.data || {});
    return this;
  },

  // ========================================================================
  // SECTION HANDLERS
  // ========================================================================

  _sectionHandlers: {
    title(sectionData) {
      const text = sectionData.text || this._config.title;
      if (this._currentY > 250) {
        this._doc.addPage();
        this._currentY = 20;
      }
      this._doc.setFont('helvetica', 'bold');
      this._doc.setFontSize(18);
      this._doc.setTextColor(46, 125, 50);
      const lines = this._doc.splitTextToSize(text, 180);
      this._doc.text(lines, 14, this._currentY + 5);
      this._currentY += 5 + (lines.length * 8) + 4;
      this._doc.setTextColor(0, 0, 0);
    },

    text(sectionData) {
      const text = sectionData.text || '';
      if (this._currentY > 280) {
        this._doc.addPage();
        this._currentY = 20;
      }
      this._doc.setFont('helvetica', 'normal');
      this._doc.setFontSize(11);
      this._doc.setTextColor(0, 0, 0);
      const lines = this._doc.splitTextToSize(text, 180);
      this._doc.text(lines, 14, this._currentY + 5);
      this._currentY += 5 + (lines.length * 5) + 2;
    },

    table(sectionData) {
      const headers = sectionData.headers || [];
      const rows = sectionData.rows || [];
      if (!headers.length) return;
      this._doc.autoTable({
        head: [headers],
        body: rows,
        startY: this._currentY + 2,
        styles: {
          fontSize: 9,
          cellPadding: 2,
          lineColor: [204, 204, 204],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [46, 125, 50],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
        },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        showHead: 'everyPage',
        margin: { left: 14, right: 14 },
        theme: 'grid',
      });
      this._currentY = this._doc.lastAutoTable ? this._doc.lastAutoTable.finalY : this._currentY + 10;
    },

    chart(sectionData) {
      const image = sectionData.image;
      if (!image) return;
      const pageWidth = this._doc.internal.pageSize.getWidth();
      const maxWidth = pageWidth - 28; // márgenes 14mm cada lado
      let width = sectionData.width || maxWidth;
      let height = sectionData.height;
      if (!height) {
        // estimar aspect ratio 16:9 si no se proporciona
        height = width * 0.5625;
      }
      if (this._currentY + height > 280) {
        this._doc.addPage();
        this._currentY = 20;
      }
      this._doc.addImage(image, 'PNG', 14, this._currentY + 3, width, height);
      this._currentY += 3 + height + 4;
    },

    metadata(sectionData) {
      // Metadata se dibuja como overlay en el footer en save(), pero
      // también podemos dibujarlo inmediatamente si se pide explícitamente
      const filters = sectionData.filters || this._config.filters;
      const userName = sectionData.userName || this._config.userName;
      this._drawMetadata(filters, userName);
    },

    spacer(sectionData) {
      const h = sectionData.height || 5;
      this._currentY += h;
      if (this._currentY > 280) {
        this._doc.addPage();
        this._currentY = 20;
      }
    },
  },

  // ========================================================================
  // LOGO, METADATA Y FOOTER
  // ========================================================================

  _drawLogo() {
    // Dibujar el logo programáticamente con canvas (sin archivos externos)
    const canvas = document.createElement('canvas');
    canvas.width = 96;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#2E7D32';
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(0, 0, 96, 96, 16);
      ctx.fill();
    } else {
      ctx.fillRect(0, 0, 96, 96);
    }
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 44px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CG', 48, 52);

    const dataUrl = canvas.toDataURL('image/png');
    this._doc.addImage(dataUrl, 'PNG', 14, 8, 14, 14);
    this._doc.setFont('helvetica', 'bold');
    this._doc.setFontSize(14);
    this._doc.setTextColor(46, 125, 50);
    this._doc.text('Control Ganadero', 32, 16);
    this._doc.setTextColor(0, 0, 0);
    this._currentY = 28;
  },

  _drawMetadata(filters, userName) {
    if (!this._doc) return;
    this._doc.setFont('helvetica', 'normal');
    this._doc.setFontSize(8);
    this._doc.setTextColor(102, 102, 102);
    if (filters) {
      this._doc.text(filters, 14, 282);
    }
  },

  _addFooter(userName, filters) {
    if (!this._doc) return;
    const pageCount = this._doc.internal.getNumberOfPages();
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

    for (let i = 1; i <= pageCount; i++) {
      this._doc.setPage(i);
      this._doc.setFont('helvetica', 'normal');
      this._doc.setFontSize(8);
      this._doc.setTextColor(102, 102, 102);
      this._doc.text(`Generado: ${dateStr} ${timeStr}`, 14, 287);
      if (userName) {
        this._doc.text(`Usuario: ${userName}`, 105, 287, { align: 'center' });
      }
      this._doc.text(`Página ${i} de ${pageCount}`, 196, 287, { align: 'right' });
      if (filters) {
        this._doc.text(filters, 14, 283);
      }
    }
  },

  // ========================================================================
  // CHART CAPTURE
  // ========================================================================

  /**
   * Captura un elemento del DOM como PNG base64.
   * Intenta html2canvas primero, fallback a Plotly.toImage si html2canvas
   * falla o devuelve un canvas mayormente vacío (típico de WebGL).
   *
   * @param {string} selector — selector CSS del elemento
   * @returns {Promise<string|null>} data URL PNG, o null si ambos fallan
   */
  async captureChart(selector) {
    const el = document.querySelector(selector);
    if (!el) {
      console.warn(`[PDFExport] captureChart: elemento no encontrado: ${selector}`);
      return null;
    }

    if (typeof window.html2canvas === 'function') {
      try {
        const canvas = await window.html2canvas(el, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
        });
        // Verificar si el canvas está mayormente en blanco (WebGL failure)
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const pixels = imageData.data;
          let nonBlankPixels = 0;
          for (let i = 3; i < pixels.length; i += 4) {
            if (pixels[i] > 0) nonBlankPixels++;
          }
          if (nonBlankPixels > 100) {
            return canvas.toDataURL('image/png');
          }
          console.warn(`[PDFExport] html2canvas devolvió canvas casi vacío (${nonBlankPixels} px), intentando Plotly.toImage`);
        } else {
          return canvas.toDataURL('image/png');
        }
      } catch (e) {
        console.warn('[PDFExport] html2canvas falló:', e);
      }
    }

    // Fallback: Plotly.toImage
    if (window.Plotly && typeof window.Plotly.toImage === 'function') {
      try {
        return await window.Plotly.toImage(el, { format: 'png', width: 800, height: 450 });
      } catch (e) {
        console.error('[PDFExport] Plotly.toImage también falló:', e);
      }
    }

    return null;
  },

  // ========================================================================
  // SAVE
  // ========================================================================

  /**
   * Asegura deps, agrega footer y descarga el PDF.
   * @param {string} [filename='reporte.pdf']
   */
  async save(filename) {
    try {
      await this._ensureDeps();
      this._ensureDoc();
      this._addFooter(this._config.userName, this._config.filters);
      this._doc.save(filename || 'reporte.pdf');
    } catch (e) {
      console.error('[PDFExport] save() falló:', e);
      throw e;
    }
  },
};
