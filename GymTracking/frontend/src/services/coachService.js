import api from '../api/axios';

const getClasses = () => api.get('/coach/classes');
const getInstructors = () => api.get('/coach/instructors');
const getClassesByInstructor = (instructorId) => api.get(`/coach/classes/by-instructor/${instructorId}`);
const markClassViewed = (classId) => api.post(`/coach/classes/${classId}/viewed`);
const addClassWatchSeconds = (classId, seconds) => api.post(`/coach/classes/${classId}/watch`, { seconds });
const markClassLiked = (classId) => api.post(`/coach/classes/${classId}/like`);

export default {
  getClasses,
  getInstructors,
  getClassesByInstructor,
  markClassViewed,
  addClassWatchSeconds,
  markClassLiked,
};
