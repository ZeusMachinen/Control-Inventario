/**
 * Formateo de números, moneda y porcentajes
 */
const Formateador = {
  /**
   * Formatea un número con separadores de miles.
   */
  numero(valor, decimales = 0) {
    return Number(valor).toLocaleString('es-CO', {
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales,
    });
  },

  /**
   * Formatea un valor monetario en pesos colombianos.
   */
  moneda(valor) {
    return Number(valor).toLocaleString('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  },

  /**
   * Formatea un porcentaje.
   */
  porcentaje(valor, decimales = 1) {
    return Number(valor).toLocaleString('es-CO', {
      style: 'percent',
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales,
    });
  },
};
