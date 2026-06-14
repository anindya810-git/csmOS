import axios from 'axios';

const api = axios.create();

api.interceptors.request.use(config => {
  const token = localStorage.getItem('superadmin_token');
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

// A 401 means the superadmin token is missing/expired/invalid (tokens last 12h).
// Clear the stale session and bounce to login instead of leaving the panel
// looking "logged in" while every request silently fails — which makes orgs
// look deleted and admin actions return "Unauthorized".
api.interceptors.response.use(
  res => res,
  err => {
    if (err?.response?.status === 401) {
      localStorage.removeItem('superadmin_token');
      localStorage.removeItem('superadmin_admin');
      if (!window.location.pathname.endsWith('/superadmin/login')) {
        window.location.replace('/superadmin/login');
      }
    }
    return Promise.reject(err);
  }
);

export default api;
