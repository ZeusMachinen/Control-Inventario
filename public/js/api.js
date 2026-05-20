/**
 * API Client — Axios instance con interceptors JWT
 */
const API = (() => {
  const BASE_URL = window.location.origin + '/api';

  const cliente = axios.create({
    baseURL: BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    withCredentials: true,
  });

  // Interceptor: agrega token Bearer a cada request
  cliente.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // Interceptor: maneja 401 y refresh automático
  let refrescando = false;
  let colaRequest = [];

  cliente.interceptors.response.use(
    (response) => response,
    async (error) => {
      const requestOriginal = error.config;

      if (error.response?.status !== 401 || requestOriginal._retry) {
        return Promise.reject(error);
      }

      if (refrescando) {
        return new Promise((resolve) => {
          colaRequest.push(() => resolve(cliente(requestOriginal)));
        });
      }

      requestOriginal._retry = true;
      refrescando = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        localStorage.setItem('access_token', data.data.access_token);
        localStorage.setItem('refresh_token', data.data.refresh_token);

        requestOriginal.headers.Authorization = `Bearer ${data.data.access_token}`;

        // Reprocesar cola
        colaRequest.forEach((cb) => cb());
        colaRequest = [];

        return cliente(requestOriginal);
      } catch (refreshError) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('usuario');
        window.location.hash = '#/login';
        return Promise.reject(refreshError);
      } finally {
        refrescando = false;
      }
    }
  );

  return {
    get: (url, params) => cliente.get(url, { params }),
    post: (url, data) => cliente.post(url, data),
    put: (url, data) => cliente.put(url, data),
    delete: (url) => cliente.delete(url),
    upload: (url, formData) =>
      cliente.post(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
  };
})();
