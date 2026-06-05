/**
 * Página de Login / Registro
 */
const LoginPage = {
  async render() {
    return `
      <div class="auth-page">
        <div class="auth-card">
          <div class="auth-logo">
            <h1>🐄 Control Ganadero</h1>
            <p>Gestión integral de ganado bovino</p>
          </div>

          <div class="tabs" id="auth-tabs">
            <div class="tab-header">
              <button class="tab-btn active" data-tab="login" onclick="LoginPage.cambiarTab('login')">
                Iniciar Sesión
              </button>
              <button class="tab-btn" data-tab="register" onclick="LoginPage.cambiarTab('register')">
                Registrarse
              </button>
            </div>
          </div>

          <div id="auth-error" class="alert alert-danger" style="display:none"></div>
          <div id="auth-success" class="alert alert-success" style="display:none"></div>

          <!-- Login Form -->
          <form id="login-form" onsubmit="LoginPage.login(event)">
            <div class="form-group">
              <label class="form-label" for="login-email">Email</label>
              <input type="email" id="login-email" class="form-input" placeholder="correo@ejemplo.com" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="login-password">Contraseña</label>
              <input type="password" id="login-password" class="form-input" placeholder="••••••" required>
            </div>
            <button type="submit" class="btn btn-primary btn-block btn-lg">
              Ingresar
            </button>
          </form>

          <!-- Register Form -->
          <form id="register-form" style="display:none" onsubmit="LoginPage.registro(event)">
            <div class="form-group">
              <label class="form-label" for="reg-nombre">Nombre completo</label>
              <input type="text" id="reg-nombre" class="form-input" placeholder="Juan Pérez" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="reg-email">Email</label>
              <input type="email" id="reg-email" class="form-input" placeholder="correo@ejemplo.com" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="reg-password">Contraseña</label>
              <input type="password" id="reg-password" class="form-input" placeholder="Mínimo 6 caracteres" required minlength="6">
            </div>
            <div class="form-group">
              <label class="form-label" for="reg-telefono">Teléfono (opcional)</label>
              <input type="text" id="reg-telefono" class="form-input" placeholder="300 123 4567">
            </div>
            <button type="submit" class="btn btn-primary btn-block btn-lg">
              Crear Cuenta
            </button>
          </form>
        </div>
      </div>
    `;
  },

  cambiarTab(tab) {
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    document.getElementById('login-form').style.display = tab === 'login' ? '' : 'none';
    document.getElementById('register-form').style.display = tab === 'register' ? '' : 'none';
    document.getElementById('auth-error').style.display = 'none';
    document.getElementById('auth-success').style.display = 'none';
  },

  mostrarError(msg) {
    const el = document.getElementById('auth-error');
    el.textContent = msg;
    el.style.display = '';
  },

  mostrarSuccess(msg) {
    const el = document.getElementById('auth-success');
    el.textContent = msg;
    el.style.display = '';
  },

  async login(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
      const { data } = await API.post('/auth/login', { email, password });

      localStorage.setItem('access_token', data.data.access_token);
      localStorage.setItem('refresh_token', data.data.refresh_token);
      localStorage.setItem('usuario', JSON.stringify(data.data.usuario));

      Router.navegar('/estadisticas');
    } catch (error) {
      const msg = error.response?.data?.error || 'Error al iniciar sesión';
      this.mostrarError(msg);
    }
  },

  async registro(e) {
    e.preventDefault();
    const nombre = document.getElementById('reg-nombre').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const telefono = document.getElementById('reg-telefono').value;

    try {
      const { data } = await API.post('/auth/registro', {
        nombre, email, password, telefono,
      });

      this.mostrarSuccess('Cuenta creada exitosamente. Redirigiendo...');

      localStorage.setItem('access_token', data.data.access_token);
      localStorage.setItem('refresh_token', data.data.refresh_token);
      localStorage.setItem('usuario', JSON.stringify(data.data.usuario));

      setTimeout(() => Router.navegar('/estadisticas'), 500);
    } catch (error) {
      const msg = error.response?.data?.error || 'Error al registrarse';
      const detalles = error.response?.data?.detalles;
      this.mostrarError(msg + (detalles ? ': ' + JSON.stringify(detalles) : ''));
    }
  },
};
