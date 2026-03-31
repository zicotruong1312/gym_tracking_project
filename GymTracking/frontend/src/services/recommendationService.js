import api from '../api/axios';

export function getTodayRecommendations() {
  return api.get('/recommendations/today');
}

export default { getTodayRecommendations };
