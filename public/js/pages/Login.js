/**
 * Página de autenticación — Login / Registro profesional con Bootstrap
 * Validación cliente-servidor, mensajes claros, diseño moderno.
 */
const LoginPage = {
  /* ─── Render completo ─────────────────────────────────── */
  async render() {
    return `
      <div class="auth-page">
        <div class="auth-card">
          <!-- Logo -->
          <div class="text-center mb-4">
            <div class="auth-logo-icon mx-auto d-flex align-items-center justify-content-center">
              <i class="fas fa-cow"></i>
            </div>
            <h1 class="h4 fw-bold text-success mt-3 mb-1">Control Ganadero</h1>
            <p class="text-muted small">Gestión integral de ganado bovino</p>
          </div>

          <!-- Tabs -->
          <div class="auth-tabs mb-4">
            <button class="auth-tab active" data-tab="login" type="button"
                    onclick="LoginPage.cambiarTab('login')">
              <i class="fas fa-sign-in-alt me-1"></i> Iniciar Sesión
            </button>
            <button class="auth-tab" data-tab="register" type="button"
                    onclick="LoginPage.cambiarTab('register')">
              <i class="fas fa-user-plus me-1"></i> Registrarse
            </button>
          </div>

          <!-- Alertas dinámicas -->
          <div id="auth-alert"></div>

          <!-- ========== FORMULARIO LOGIN ========== -->
          <form id="login-form" novalidate onsubmit="LoginPage.login(event)">
            <div class="mb-3">
              <label class="form-label fw-semibold" for="login-email">
                <i class="fas fa-envelope text-success me-1 small"></i> Correo electrónico
              </label>
              <div class="input-group">
                <span class="input-group-text bg-white"><i class="fas fa-envelope text-muted"></i></span>
                <input type="email" id="login-email" class="form-control"
                       placeholder="tu@correo.com" required autocomplete="email"
                       onblur="LoginPage.validarCampo('login','email','requerido|email')"
                       oninput="LoginPage.limpiarError('login','email')">
              </div>
              <div class="invalid-feedback" id="login-email-error"></div>
            </div>

            <div class="mb-4">
              <label class="form-label fw-semibold" for="login-password">
                <i class="fas fa-lock text-success me-1 small"></i> Contraseña
              </label>
              <div class="input-group">
                <span class="input-group-text bg-white"><i class="fas fa-lock text-muted"></i></span>
                <input type="password" id="login-password" class="form-control"
                       placeholder="Ingresá tu contraseña" required autocomplete="current-password"
                       onblur="LoginPage.validarCampo('login','password','requerido')"
                       oninput="LoginPage.limpiarError('login','password')">
                <button class="btn btn-outline-secondary bg-white" type="button"
                        onclick="LoginPage.togglePassword('login-password', this)"
                        tabindex="-1">
                  <i class="fas fa-eye"></i>
                </button>
              </div>
              <div class="invalid-feedback" id="login-password-error"></div>
            </div>

            <button type="submit" class="btn btn-success w-100 btn-lg position-relative" id="login-btn">
              <span id="login-btn-text"><i class="fas fa-sign-in-alt me-1"></i> Ingresar</span>
              <span id="login-btn-loading" class="d-none">
                <span class="spinner-border spinner-border-sm me-1" role="status"></span>
                Ingresando...
              </span>
            </button>
          </form>

          <!-- ========== FORMULARIO REGISTRO ========== -->
          <form id="register-form" style="display:none" novalidate onsubmit="LoginPage.registro(event)">
            <div class="mb-3">
              <label class="form-label fw-semibold" for="reg-nombre">
                <i class="fas fa-user text-success me-1 small"></i> Nombre completo
              </label>
              <div class="input-group">
                <span class="input-group-text bg-white"><i class="fas fa-user text-muted"></i></span>
                <input type="text" id="reg-nombre" class="form-control"
                       placeholder="Juan Pérez" required autocomplete="name"
                       onblur="LoginPage.validarCampo('reg','nombre','requerido|min:3|max:150')"
                       oninput="LoginPage.limpiarError('reg','nombre')">
              </div>
              <div class="invalid-feedback" id="reg-nombre-error"></div>
            </div>

            <div class="mb-3">
              <label class="form-label fw-semibold" for="reg-email">
                <i class="fas fa-envelope text-success me-1 small"></i> Correo electrónico
              </label>
              <div class="input-group">
                <span class="input-group-text bg-white"><i class="fas fa-envelope text-muted"></i></span>
                <input type="email" id="reg-email" class="form-control"
                       placeholder="tu@correo.com" required autocomplete="email"
                       onblur="LoginPage.validarCampo('reg','email','requerido|email')"
                       oninput="LoginPage.limpiarError('reg','email')">
              </div>
              <div class="invalid-feedback" id="reg-email-error"></div>
            </div>

            <div class="mb-3">
              <label class="form-label fw-semibold" for="reg-password">
                <i class="fas fa-key text-success me-1 small"></i> Contraseña
              </label>
              <div class="input-group">
                <span class="input-group-text bg-white"><i class="fas fa-key text-muted"></i></span>
                <input type="password" id="reg-password" class="form-control"
                       placeholder="Mínimo 6 caracteres" required autocomplete="new-password"
                       onblur="LoginPage.validarCampo('reg','password','requerido|min:6')"
                       oninput="LoginPage.actualizarFortaleza(this.value); LoginPage.limpiarError('reg','password')">
                <button class="btn btn-outline-secondary bg-white" type="button"
                        onclick="LoginPage.togglePassword('reg-password', this)"
                        tabindex="-1">
                  <i class="fas fa-eye"></i>
                </button>
              </div>
              <div class="invalid-feedback" id="reg-password-error"></div>
              <!-- Fortaleza -->
              <div class="mt-2" id="reg-password-strength" style="display:none">
                <div class="d-flex justify-content-between small mb-1">
                  <span class="text-muted">Fortaleza:</span>
                  <span class="fw-semibold" id="reg-password-label">Débil</span>
                </div>
                <div class="progress" style="height:6px">
                  <div class="progress-bar" id="reg-password-bar" role="progressbar"
                       style="width:0%; transition: width 0.3s, background-color 0.3s"></div>
                </div>
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label fw-semibold" for="reg-password-confirm">
                <i class="fas fa-check-circle text-success me-1 small"></i> Confirmar contraseña
              </label>
              <div class="input-group">
                <span class="input-group-text bg-white"><i class="fas fa-check text-muted"></i></span>
                <input type="password" id="reg-password-confirm" class="form-control"
                       placeholder="Repetí la contraseña" required autocomplete="new-password"
                       onblur="LoginPage.validarConfirmacion()"
                       oninput="LoginPage.limpiarError('reg','password-confirm')">
              </div>
              <div class="invalid-feedback" id="reg-password-confirm-error"></div>
            </div>

            <div class="mb-4">
              <label class="form-label fw-semibold" for="reg-telefono">
                <i class="fas fa-phone text-success me-1 small"></i> Teléfono <span class="text-muted fw-normal">(opcional)</span>
              </label>
              <div class="input-group">
                <span class="input-group-text bg-white"><i class="fas fa-phone text-muted"></i></span>
                <input type="text" id="reg-telefono" class="form-control"
                       placeholder="300 123 4567" autocomplete="tel">
              </div>
            </div>

            <button type="submit" class="btn btn-success w-100 btn-lg position-relative" id="register-btn">
              <span id="register-btn-text"><i class="fas fa-user-plus me-1"></i> Crear Cuenta</span>
              <span id="register-btn-loading" class="d-none">
                <span class="spinner-border spinner-border-sm me-1" role="status"></span>
                Creando cuenta...
              </span>
            </button>
          </form>

          <p class="text-center text-muted small mt-4 mb-0">
            <i class="fas fa-shield-alt me-1"></i> Tus datos están seguros
          </p>
        </div>
      </div>
    `;
  },

  /* ─── Cambio de tabs ──────────────────────────────────── */
  cambiarTab(tab) {
    document.querySelectorAll('.auth-tab').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    document.getElementById('login-form').style.display = tab === 'login' ? '' : 'none';
    document.getElementById('register-form').style.display = tab === 'register' ? '' : 'none';
    this.limpiarAlertas();
  },

  /* ─── Alertas ─────────────────────────────────────────── */
  mostrarAlerta(msg, tipo) {
    const el = document.getElementById('auth-alert');
    el.innerHTML = `
      <div class="alert alert-${tipo} alert-dismissible fade show d-flex align-items-center gap-2 py-2" role="alert">
        <i class="fas fa-${tipo === 'danger' ? 'exclamation-circle' : 'check-circle'} me-1"></i>
        <span>${msg}</span>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      </div>
    `;
  },

  limpiarAlertas() {
    document.getElementById('auth-alert').innerHTML = '';
  },

  /* ─── Mostrar/ocultar contraseña ──────────────────────── */
  togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    const icon = btn.querySelector('i');
    if (input.type === 'password') {
      input.type = 'text';
      icon.className = 'fas fa-eye-slash';
    } else {
      input.type = 'password';
      icon.className = 'fas fa-eye';
    }
  },

  /* ─── Validación de campo individual ──────────────────── */
  validarCampo(form, campo, reglas) {
    const prefix = form === 'login' ? 'login' : 'reg';
    const el = document.getElementById(`${prefix}-${campo}`);
    const errorEl = document.getElementById(`${prefix}-${campo}-error`);
    if (!el) return;

    const datos = {};
    datos[campo] = el.value;

    const reglasObj = {};
    reglasObj[campo] = reglas;

    const resultado = Validador.validar(datos, reglasObj);

    if (!resultado.valido && resultado.errores[campo]) {
      el.classList.add('is-invalid');
      errorEl.textContent = resultado.errores[campo][0];
      return false;
    }
    el.classList.remove('is-invalid');
    errorEl.textContent = '';
    return true;
  },

  limpiarError(form, campo) {
    const prefix = form === 'login' ? 'login' : 'reg';
    const el = document.getElementById(`${prefix}-${campo}`);
    const errorEl = document.getElementById(`${prefix}-${campo}-error`);
    if (!el) return;
    el.classList.remove('is-invalid');
    if (errorEl) errorEl.textContent = '';
  },

  validarConfirmacion() {
    const pwd = document.getElementById('reg-password').value;
    const confirm = document.getElementById('reg-password-confirm').value;
    const el = document.getElementById('reg-password-confirm');
    const errorEl = document.getElementById('reg-password-confirm-error');

    if (!confirm) {
      el.classList.add('is-invalid');
      errorEl.textContent = 'Confirmá tu contraseña';
      return false;
    }
    if (pwd !== confirm) {
      el.classList.add('is-invalid');
      errorEl.textContent = 'Las contraseñas no coinciden';
      return false;
    }
    el.classList.remove('is-invalid');
    errorEl.textContent = '';
    return true;
  },

  /* ─── Fortaleza de contraseña ─────────────────────────── */
  actualizarFortaleza(password) {
    const container = document.getElementById('reg-password-strength');
    const bar = document.getElementById('reg-password-bar');
    const label = document.getElementById('reg-password-label');

    if (!password) {
      container.style.display = 'none';
      return;
    }
    container.style.display = '';

    let puntos = 0;
    if (password.length >= 6) puntos++;
    if (password.length >= 10) puntos++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) puntos++;
    if (/\d/.test(password)) puntos++;
    if (/[^a-zA-Z0-9]/.test(password)) puntos++;

    const niveles = [
      { min: 0, label: 'Débil',    width: 25,  color: '#dc3545' },
      { min: 2, label: 'Débil',    width: 25,  color: '#dc3545' },
      { min: 3, label: 'Media',    width: 55,  color: '#f57c00' },
      { min: 4, label: 'Fuerte',   width: 80,  color: '#2e7d32' },
      { min: 5, label: 'Muy fuerte', width: 100, color: '#1b5e20' },
    ];

    const nivel = niveles[puntos] || niveles[0];
    bar.style.width = `${nivel.width}%`;
    bar.style.backgroundColor = nivel.color;
    label.textContent = nivel.label;
    label.style.color = nivel.color;
  },

  /* ─── Validar formulario completo ─────────────────────── */
  validarLogin() {
    const valido = [];
    valido.push(this.validarCampo('login', 'email', 'requerido|email'));
    valido.push(this.validarCampo('login', 'password', 'requerido'));
    return valido.every(Boolean);
  },

  validarRegistro() {
    const valido = [];
    valido.push(this.validarCampo('reg', 'nombre', 'requerido|min:3|max:150'));
    valido.push(this.validarCampo('reg', 'email', 'requerido|email'));
    valido.push(this.validarCampo('reg', 'password', 'requerido|min:6'));
    valido.push(this.validarConfirmacion());
    return valido.every(Boolean);
  },

  /* ─── Mostrar errores del servidor en campos ──────────── */
  mostrarErroresServidor(detalles) {
    if (!detalles || typeof detalles !== 'object') return;

    for (const [campo, msgs] of Object.entries(detalles)) {
      // Login
      let el = document.getElementById(`login-${campo}`);
      let errorEl = document.getElementById(`login-${campo}-error`);
      // Register
      if (!el) {
        el = document.getElementById(`reg-${campo}`);
        errorEl = document.getElementById(`reg-${campo}-error`);
      }
      if (el && errorEl) {
        el.classList.add('is-invalid');
        errorEl.textContent = Array.isArray(msgs) ? msgs[0] : msgs;
      }
    }
  },

  /* ─── Loading state ───────────────────────────────────── */
  setLoading(form, loading) {
    const prefix = form === 'login' ? 'login' : 'register';
    const btn = document.getElementById(`${prefix}-btn`);
    const text = document.getElementById(`${prefix}-btn-text`);
    const spinner = document.getElementById(`${prefix}-btn-loading`);
    if (!btn) return;
    btn.disabled = loading;
    text.classList.toggle('d-none', loading);
    spinner.classList.toggle('d-none', !loading);
  },

  /* ─── Login ────────────────────────────────────────────── */
  async login(e) {
    e.preventDefault();
    this.limpiarAlertas();

    if (!this.validarLogin()) return;

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    this.setLoading('login', true);

    try {
      const { data } = await API.post('/auth/login', { email, password });

      localStorage.setItem('access_token', data.data.access_token);
      localStorage.setItem('refresh_token', data.data.refresh_token);
      localStorage.setItem('usuario', JSON.stringify(data.data.usuario));

      Router.navegar('/estadisticas');
    } catch (error) {
      const err = error.response?.data;
      if (err?.detalles && typeof err.detalles === 'object') {
        this.mostrarErroresServidor(err.detalles);
      }
      this.mostrarAlerta(
        err?.error || 'Error al iniciar sesión. Verificá tus credenciales.',
        'danger'
      );
    } finally {
      this.setLoading('login', false);
    }
  },

  /* ─── Registro ──────────────────────────────────────────── */
  async registro(e) {
    e.preventDefault();
    this.limpiarAlertas();

    if (!this.validarRegistro()) return;

    const nombre = document.getElementById('reg-nombre').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const telefono = document.getElementById('reg-telefono').value.trim();

    this.setLoading('register', true);

    try {
      const { data } = await API.post('/auth/registro', {
        nombre, email, password, telefono: telefono || null,
      });

      this.mostrarAlerta('Cuenta creada exitosamente. Redirigiendo...', 'success');

      localStorage.setItem('access_token', data.data.access_token);
      localStorage.setItem('refresh_token', data.data.refresh_token);
      localStorage.setItem('usuario', JSON.stringify(data.data.usuario));

      setTimeout(() => Router.navegar('/estadisticas'), 800);
    } catch (error) {
      const err = error.response?.data;
      if (err?.detalles && typeof err.detalles === 'object') {
        this.mostrarErroresServidor(err.detalles);
      }
      this.mostrarAlerta(
        err?.error || 'Error al registrarse. Intentá de nuevo.',
        'danger'
      );
    } finally {
      this.setLoading('register', false);
    }
  },
};
