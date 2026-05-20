/**
 * Validación de formularios del lado del cliente
 */
const Validador = {
  /**
   * Valida un conjunto de campos contra reglas.
   * Reglas: { campo: 'requerido|email|min:3|max:255|numerico' }
   * Retorna { valido: bool, errores: { campo: [msg] } }
   */
  validar(datos, reglas) {
    const errores = {};

    for (const [campo, reglaStr] of Object.entries(reglas)) {
      const reglasLista = reglaStr.split('|');
      const valor = datos[campo];

      for (const regla of reglasLista) {
        let nombreRegla = regla;
        let params = [];

        if (regla.includes(':')) {
          [nombreRegla, ...params] = regla.split(':');
        }

        const validador = this[`validar${nombreRegla.charAt(0).toUpperCase()}${nombreRegla.slice(1)}`];
        if (validador) {
          const error = validador.call(this, campo, valor, params);
          if (error) {
            if (!errores[campo]) errores[campo] = [];
            errores[campo].push(error);
          }
        }
      }
    }

    return {
      valido: Object.keys(errores).length === 0,
      errores,
    };
  },

  validarRequerido(campo, valor) {
    if (valor === undefined || valor === null || String(valor).trim() === '') {
      return `El campo ${campo} es obligatorio`;
    }
    return null;
  },

  validarEmail(campo, valor) {
    if (valor && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)) {
      return 'Ingrese un email válido';
    }
    return null;
  },

  validarMin(campo, valor, params) {
    const min = parseInt(params[0]) || 0;
    if (valor && String(valor).length < min) {
      return `Debe tener al menos ${min} caracteres`;
    }
    return null;
  },

  validarMax(campo, valor, params) {
    const max = parseInt(params[0]) || 255;
    if (valor && String(valor).length > max) {
      return `Debe tener máximo ${max} caracteres`;
    }
    return null;
  },

  validarNumerico(campo, valor) {
    if (valor && isNaN(valor)) {
      return 'Debe ser un valor numérico';
    }
    return null;
  },
};
