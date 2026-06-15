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
    
    const globalVolume = getAudioVolume();
    const finalVolume = Math.min(1.0, volume * 10.0 * globalVolume); // Boosted volume multiplier from 5.0 to 10.0
    
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(finalVolume, startTime + 0.01);
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

export function getAudioVolume() {
  const vol = localStorage.getItem('feedback_audio_volume');
  if (vol === null) return 0.8; // Default to 80% volume
  return parseFloat(vol);
}

export function setAudioVolume(volume) {
  localStorage.setItem('feedback_audio_volume', String(volume));
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
    
    const globalVolume = getAudioVolume();
    const finalVolume = Math.min(1.0, 0.2 * 10.0 * globalVolume); // Boosted volume multiplier to 10.0
    
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(finalVolume, now + 0.02);
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
    
    const globalVolume = getAudioVolume();
    const finalVolume = Math.min(1.0, 0.15 * 10.0 * globalVolume); // Boosted volume multiplier to 10.0
    
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(finalVolume, now + 0.04);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + duration);
  } catch (err) {
    console.warn('feedbackService playTimerExpired error:', err);
  }
}

// 2. Boss Battle Specific Methods
export function playBossAttack() {
  if (!isAudioEnabled()) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    // Fast frequency slide representing a sword slash/hit
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.12);
    
    const globalVolume = getAudioVolume();
    const finalVolume = Math.min(1.0, 0.14 * 10.0 * globalVolume);
    
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(finalVolume, now + 0.015);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.12);
    
    // Supporting chime
    playTone(659.25, now + 0.03, 0.14, 'sine', 0.1);
  } catch (err) {
    console.warn('feedbackService playBossAttack error:', err);
  }
}

export function playBossDamage() {
  if (!isAudioEnabled()) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const duration = 0.32;
    // Low explosion rumble
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.linearRampToValueAtTime(40, now + duration);
    
    const globalVolume = getAudioVolume();
    const finalVolume = Math.min(1.0, 0.22 * 10.0 * globalVolume);
    
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(finalVolume, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + duration);
  } catch (err) {
    console.warn('feedbackService playBossDamage error:', err);
  }
}

export function playBossVictory() {
  if (!isAudioEnabled()) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    // Triumphant battle victory arpeggio
    const freqs = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5 -> E5 -> G5 -> C6 -> E6
    freqs.forEach((f, idx) => {
      playTone(f, now + idx * 0.07, 0.28, 'sine', 0.14);
    });
  } catch (err) {
    console.warn('feedbackService playBossVictory error:', err);
  }
}

export function playBossDefeat() {
  if (!isAudioEnabled()) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    // Sad minor/diminished arpeggio
    const freqs = [392.00, 349.23, 311.13, 261.63, 196.00]; // G4 -> F4 -> Eb4 -> C4 -> G3
    freqs.forEach((f, idx) => {
      playTone(f, now + idx * 0.11, 0.35, 'triangle', 0.15);
    });
  } catch (err) {
    console.warn('feedbackService playBossDefeat error:', err);
  }
}

export function playBossWaveComplete() {
  if (!isAudioEnabled()) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    // Level up rising chime
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99];
    notes.forEach((freq, idx) => {
      playTone(freq, now + idx * 0.05, 0.12, 'sine', 0.12);
    });
  } catch (err) {
    console.warn('feedbackService playBossWaveComplete error:', err);
  }
}

// 3. Wrangling Speedrun Specific Methods
export function playSpeedrunCorrect() {
  if (!isAudioEnabled()) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    // Quick Mario Coin chime (B5 -> E6)
    playTone(987.77, now, 0.05, 'sine', 0.16);
    playTone(1318.51, now + 0.04, 0.12, 'sine', 0.16);
  } catch (err) {
    console.warn('feedbackService playSpeedrunCorrect error:', err);
  }
}

export function playSpeedrunWrong() {
  if (!isAudioEnabled()) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const duration = 0.15;
    // Penalty buzz
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.linearRampToValueAtTime(130, now + duration);
    
    const globalVolume = getAudioVolume();
    const finalVolume = Math.min(1.0, 0.18 * 10.0 * globalVolume);
    
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(finalVolume, now + 0.015);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + duration);
  } catch (err) {
    console.warn('feedbackService playSpeedrunWrong error:', err);
  }
}

export function playSpeedrunTick() {
  if (!isAudioEnabled()) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    // Clean high woodblock/click
    playTone(1500, now, 0.012, 'sine', 0.08);
  } catch (err) {
    console.warn('feedbackService playSpeedrunTick error:', err);
  }
}

export function playSpeedrunComplete() {
  if (!isAudioEnabled()) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    // Rapid bright arpeggio
    const notes = [392.00, 523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      playTone(freq, now + idx * 0.05, 0.16, 'sine', 0.14);
    });
  } catch (err) {
    console.warn('feedbackService playSpeedrunComplete error:', err);
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

// 4. Haptic Methods
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

// 5. Convenience Trigger Methods
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

export function triggerBossAttackFeedback() {
  playBossAttack();
  vibrate([35, 25, 45]);
}

export function triggerBossDamageFeedback() {
  playBossDamage();
  vibrate([130, 70, 130]);
}

export function triggerBossVictoryFeedback() {
  playBossVictory();
  vibrate([120, 60, 120, 60, 180]);
}

export function triggerBossDefeatFeedback() {
  playBossDefeat();
  vibrate([320]);
}

export function triggerBossWaveCompleteFeedback() {
  playBossWaveComplete();
  vibrate([70, 50, 130]);
}

export function triggerSpeedrunCorrectFeedback() {
  playSpeedrunCorrect();
  vibrate([35]);
}

export function triggerSpeedrunWrongFeedback() {
  playSpeedrunWrong();
  vibrate([95]);
}

export function triggerSpeedrunTickFeedback() {
  playSpeedrunTick();
  vibrate([12]);
}

export function triggerSpeedrunCompleteFeedback() {
  playSpeedrunComplete();
  vibrate([70, 50, 70, 50, 90]);
}
