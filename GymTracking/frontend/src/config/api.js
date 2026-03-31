const origin = import.meta.env.VITE_API_ORIGIN || 'http://localhost:5000';

export const API_ORIGIN = origin.replace(/\/$/, '');
export const API_BASE_URL = `${API_ORIGIN}/api`;
