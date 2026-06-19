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

// Timer preferences
const TIMER_DEFAULTS = {
  timer_enabled_mcq: false,
  timer_enabled_ftb: false,
  timer_enabled_dataset: false,
  timer_duration_mcq_seconds: 60,
  timer_duration_ftb_seconds: 60,
  timer_duration_dataset_seconds: 120,
};

export const TIMER_STEPS = [30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 240, 300, 360, 420, 480];

export function stepTimer(currentSeconds, direction) {
  const idx = TIMER_STEPS.indexOf(currentSeconds);
  if (idx === -1) return currentSeconds;
  if (direction === 'up') return TIMER_STEPS[Math.min(idx + 1, TIMER_STEPS.length - 1)];
  return TIMER_STEPS[Math.max(idx - 1, 0)];
}

export function formatTimerSeconds(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function getTimerPref(key) {
  const raw = localStorage.getItem(key);
  if (raw === null) return TIMER_DEFAULTS[key];
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  const num = parseInt(raw, 10);
  return isNaN(num) ? TIMER_DEFAULTS[key] : num;
}

function setTimerPref(key, value) {
  localStorage.setItem(key, String(value));
}

export function getTimerEnabled(prefix) {
  return getTimerPref(`timer_enabled_${prefix}`);
}

export function setTimerEnabled(prefix, val) {
  setTimerPref(`timer_enabled_${prefix}`, val);
}

export function getTimerDuration(prefix) {
  return getTimerPref(`timer_duration_${prefix}_seconds`);
}

export function setTimerDuration(prefix, seconds) {
  if (!TIMER_STEPS.includes(seconds)) return false;
  setTimerPref(`timer_duration_${prefix}_seconds`, seconds);
  return true;
}
