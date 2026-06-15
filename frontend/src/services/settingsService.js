// Service for managing study session settings, limits, and exclusions in localStorage

export function getSessionQuestionCount() {
  const val = localStorage.getItem('sessionQuestionCount');
  return val ? parseInt(val, 10) : 10;
}

export function setSessionQuestionCount(count) {
  const cleanCount = Math.max(1, Math.min(100, count));
  localStorage.setItem('sessionQuestionCount', String(cleanCount));
  return cleanCount;
}

export function getDisabledSessionCourses() {
  try {
    return JSON.parse(localStorage.getItem('disabledSessionCourses') || '[]');
  } catch (e) {
    return [];
  }
}

export function toggleSessionModeForCourse(courseSlug) {
  const list = getDisabledSessionCourses();
  const index = list.indexOf(courseSlug);
  if (index > -1) {
    list.splice(index, 1);
  } else {
    list.push(courseSlug);
  }
  localStorage.setItem('disabledSessionCourses', JSON.stringify(list));
  return list;
}

export function getDisabledSessionTracks() {
  try {
    return JSON.parse(localStorage.getItem('disabledSessionTracks') || '[]');
  } catch (e) {
    return [];
  }
}

export function toggleSessionModeForTrack(trackSlug) {
  const list = getDisabledSessionTracks();
  const index = list.indexOf(trackSlug);
  if (index > -1) {
    list.splice(index, 1);
  } else {
    list.push(trackSlug);
  }
  localStorage.setItem('disabledSessionTracks', JSON.stringify(list));
  return list;
}

export function getDisabledSessionCategories() {
  try {
    return JSON.parse(localStorage.getItem('disabledSessionCategories') || '[]');
  } catch (e) {
    return [];
  }
}

export function toggleSessionModeForCategory(category) {
  const list = getDisabledSessionCategories();
  const index = list.indexOf(category);
  if (index > -1) {
    list.splice(index, 1);
  } else {
    list.push(category);
  }
  localStorage.setItem('disabledSessionCategories', JSON.stringify(list));
  return list;
}

export function isSessionModeDisabled(category, courseSlug, trackSlug) {
  // Check category
  if (category && getDisabledSessionCategories().includes(category)) {
    return true;
  }
  // Check course
  if (courseSlug && getDisabledSessionCourses().includes(courseSlug)) {
    return true;
  }
  // Check track
  if (trackSlug && getDisabledSessionTracks().includes(trackSlug)) {
    return true;
  }
  return false;
}

export function getSessionLimit(category, courseSlug, trackSlug, totalCount) {
  if (isSessionModeDisabled(category, courseSlug, trackSlug)) {
    return totalCount;
  }
  const baseCount = getSessionQuestionCount();
  // Flashcards get a slightly higher default limit (baseCount + 5) for better study sessions
  if (category === 'flashcard' || category === 'flashcards') {
    return baseCount + 5;
  }
  return baseCount;
}
