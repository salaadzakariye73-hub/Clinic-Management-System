import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

// attach the JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// expired / invalid token -> back to the login page
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && localStorage.getItem('token')) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// readable error text for any failed request
export const errMsg = (err) =>
  err.response?.data?.message || (err.request ? 'Server-ka lama gaari karo' : err.message) || 'Cilad ayaa dhacday';

// today as YYYY-MM-DD in the browser's local time
export const todayLocal = () => new Date().toLocaleDateString('en-CA');

export default api;
