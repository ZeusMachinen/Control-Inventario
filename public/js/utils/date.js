/**
 * Manejo de fechas y cálculo de edad
 */
const DateUtil = {
  /**
   * Formatea una fecha ISO a formato legible.
   */
  formatear(fecha) {
    if (!fecha) return '';
    const d = new Date(fecha + 'T00:00:00');
    return d.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  },

  /**
   * Formato corto: YYYY-MM-DD
   */
  formatoInput(fecha) {
    if (!fecha) return '';
    return fecha.substring(0, 10);
  },

  /**
   * Calcula la edad en años y meses desde una fecha de nacimiento.
   */
  calcularEdad(fechaNacimiento) {
    if (!fechaNacimiento) return { anios: 0, meses: 0, totalMeses: 0 };

    const hoy = new Date();
    const nac = new Date(fechaNacimiento + 'T00:00:00');
    let anios = hoy.getFullYear() - nac.getFullYear();
    let meses = hoy.getMonth() - nac.getMonth();

    if (meses < 0) {
      anios--;
      meses += 12;
    }

    if (hoy.getDate() < nac.getDate()) {
      meses--;
      if (meses < 0) {
        anios--;
        meses += 12;
      }
    }

    return {
      anios,
      meses,
      totalMeses: anios * 12 + meses,
    };
  },

  /**
   * Texto legible de edad: "3 años 2 meses"
   */
  edadTexto(fechaNacimiento) {
    const { anios, meses } = this.calcularEdad(fechaNacimiento);
    const partes = [];
    if (anios > 0) partes.push(`${anios} año${anios !== 1 ? 's' : ''}`);
    if (meses > 0) partes.push(`${meses} mes${meses !== 1 ? 'es' : ''}`);
    return partes.join(' ') || '0 meses';
  },

  /**
   * Determina la etapa según edad en meses.
   */
  determinarEtapa(totalMeses) {
    if (totalMeses <= 12) return 'Ternero';
    if (totalMeses <= 24) return 'Novillo';
    return 'Adulto';
  },
};
