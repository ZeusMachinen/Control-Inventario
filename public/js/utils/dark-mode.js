/**
 * Dark Mode — Toggle con persistencia en localStorage
 *
 * Dependencia: el <html> ya tiene la clase .dark-mode si estaba activa
 * (se aplica desde un inline script en <head> para evitar flash).
 */

const DarkMode = {
  KEY: 'dark-mode-preference',

  /**
   * Inicializa el botón toggle y sincroniza el icono.
   */
  init() {
    this._actualizarIcono();
  },

  /**
   * Retorna si dark mode está activo.
   */
  activo() {
    return document.documentElement.classList.contains('dark-mode');
  },

  /**
   * Activa o desactiva dark mode y persiste.
   */
  toggle() {
    const html = document.documentElement;
    const activar = !html.classList.contains('dark-mode');

    if (activar) {
      html.classList.add('dark-mode');
      localStorage.setItem(this.KEY, 'true');
    } else {
      html.classList.remove('dark-mode');
      localStorage.setItem(this.KEY, 'false');
    }

    this._actualizarIcono();
  },

  /**
   * Actualiza el icono del botón toggle según el estado actual.
   */
  _actualizarIcono() {
    const btn = document.getElementById('dark-mode-toggle');
    if (!btn) return;

    const isDark = this.activo();
    btn.innerHTML = isDark
      ? '<i class="fas fa-sun"></i>'
      : '<i class="fas fa-moon"></i>';
    btn.title = isDark ? 'Modo claro' : 'Modo oscuro';
  },
};
