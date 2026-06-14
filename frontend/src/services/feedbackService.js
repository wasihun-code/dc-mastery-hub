// Feedback Service for DC Mastery Hub
// Provides synthesized audio chime feedback and haptic vibration feedback

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Play a single synthesized tone with ADSR envelope shape
function playTone(freq, startTime, duration, type = 'sine', volume = 0.2) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = type;
    osc.frequency.value = freq;
    
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start(startTime);
    osc.stop(startTime + duration);
  } catch (err) {
    console.warn('Feedback playTone error:', err);
  }
}

// Preferences Helpers
export function isAudioEnabled() {
  return localStorage.getItem('feedback_audio_enabled') !== 'false';
}

export function setAudioEnabled(enabled) {
  localStorage.setItem('feedback_audio_enabled', String(enabled));
}

export function isHapticsEnabled() {
  return localStorage.getItem('feedback_haptics_enabled') !== 'false';
}

export function setHapticsEnabled(enabled) {
  localStorage.setItem('feedback_haptics_enabled', String(enabled));
}

// 1. Audio Methods
export function playCorrect() {
  if (!isAudioEnabled()) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    // Positive double chime
    playTone(659.25, now, 0.08, 'sine', 0.15); // E5
    playTone(880, now + 0.08, 0.18, 'sine', 0.15); // A5
  } catch (err) {
    console.warn('feedbackService playCorrect error:', err);
  }
}

export function playWrong() {
  if (!isAudioEnabled()) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const duration = 0.25;
    
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.linearRampToValueAtTime(80, now + duration);
    
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.2, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + duration);
  } catch (err) {
    console.warn('feedbackService playWrong error:', err);
  }
}

export function playSuccess() {
  if (!isAudioEnabled()) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, index) => {
      playTone(freq, now + index * 0.08, 0.15, 'sine', 0.15);
    });
  } catch (err) {
    console.warn('feedbackService playSuccess error:', err);
  }
}

export function playTimerWarning() {
  if (!isAudioEnabled()) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    playTone(987.77, now, 0.06, 'sine', 0.12); // B5 (clean beep)
  } catch (err) {
    console.warn('feedbackService playTimerWarning error:', err);
  }
}

export function playTimerExpired() {
  if (!isAudioEnabled()) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const duration = 0.35;
    
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(90, now + duration);
    
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.15, now + 0.04);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + duration);
  } catch (err) {
    console.warn('feedbackService playTimerExpired error:', err);
  }
}

// Helper to trigger haptics safely
function vibrate(pattern) {
  if (!isHapticsEnabled()) return;
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  } catch (err) {
    // Gracefully no-op
  }
}

// 2. Haptic Methods
export function vibrateCorrect() {
  vibrate([60]);
}

export function vibrateWrong() {
  vibrate([150]);
}

export function vibrateSuccess() {
  vibrate([80, 50, 80]);
}

export function vibrateTimerWarning() {
  vibrate([50]);
}

export function vibrateTimerExpired() {
  vibrate([250]);
}

// 3. Convenience Methods
export function triggerCorrectFeedback() {
  playCorrect();
  vibrateCorrect();
}

export function triggerWrongFeedback() {
  playWrong();
  vibrateWrong();
}

export function triggerSuccessFeedback() {
  playSuccess();
  vibrateSuccess();
}

export function triggerTimerWarningFeedback() {
  playTimerWarning();
  vibrateTimerWarning();
}

export function triggerTimerExpiredFeedback() {
  playTimerExpired();
  vibrateTimerExpired();
}
