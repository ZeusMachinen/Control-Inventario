const Toast = {
  container: null,

  init() {
    if (document.getElementById('toast-container')) return;
    const div = document.createElement('div');
    div.id = 'toast-container';
    div.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    div.style.zIndex = '9999';
    document.body.appendChild(div);
    this.container = div;
  },

  _show(message, type, title) {
    this.init();
    const bg = type === 'error' ? 'text-bg-danger' : type === 'success' ? 'text-bg-success' : type === 'warning' ? 'text-bg-warning' : 'text-bg-info';
    const icon = type === 'error' ? 'fa-circle-xmark' : type === 'success' ? 'fa-circle-check' : type === 'warning' ? 'fa-triangle-exclamation' : 'fa-circle-info';
    const id = 'toast-' + Date.now() + Math.random().toString(36).slice(2, 6);

    const el = document.createElement('div');
    el.id = id;
    el.className = `toast ${bg}`;
    el.role = 'alert';
    el.innerHTML = `
      <div class="toast-header ${bg} border-0">
        <i class="fas ${icon} me-2"></i>
        <strong class="me-auto">${title || (type === 'error' ? 'Error' : type === 'success' ? 'Éxito' : type === 'warning' ? 'Advertencia' : 'Info')}</strong>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
      </div>
      <div class="toast-body">${message}</div>
    `;
    this.container.appendChild(el);

    const bsToast = new bootstrap.Toast(el, { delay: type === 'error' ? 6000 : 3500 });
    bsToast.show();
    el.addEventListener('hidden.bs.toast', () => el.remove());
  },

  error(msg, title) { this._show(msg, 'error', title); },
  success(msg, title) { this._show(msg, 'success', title); },
  warning(msg, title) { this._show(msg, 'warning', title); },
  info(msg, title) { this._show(msg, 'info', title); },
};

const Confirm = {
  modal: null,

  async show(message, title) {
    return new Promise((resolve) => {
      const modalId = 'confirm-modal-' + Date.now();
      const backdrop = document.createElement('div');
      backdrop.innerHTML = `
        <div class="modal fade show d-block" tabindex="-1" id="${modalId}" style="background:rgba(0,0,0,0.5)">
          <div class="modal-dialog modal-dialog-centered modal-sm">
            <div class="modal-content">
              <div class="modal-header">
                <h6 class="modal-title">${title || 'Confirmar'}</h6>
                <button class="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <div class="modal-body">${message}</div>
              <div class="modal-footer">
                <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">Cancelar</button>
                <button type="button" class="btn btn-primary btn-sm" id="${modalId}-confirm">Aceptar</button>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(backdrop);

      const modalEl = backdrop.firstElementChild;
      const bsModal = new bootstrap.Modal(modalEl, { backdrop: 'static' });
      bsModal.show();

      modalEl.querySelector(`#${modalId}-confirm`).onclick = () => {
        bsModal.hide();
        resolve(true);
      };
      modalEl.addEventListener('hidden.bs.modal', () => {
        backdrop.remove();
        resolve(false);
      });
    });
  },
};

document.addEventListener('DOMContentLoaded', () => {
  Toast.init();
  const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
  [...tooltipTriggerList].map(el => new bootstrap.Tooltip(el));
});