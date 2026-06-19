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

// Legacy internal helper (used by existing play* functions)
function _playRawTone(freq, startTime, duration, type = 'sine', volume = 0.2) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;

    const globalVolume = getAudioVolume();
    const finalVolume = Math.min(1.0, volume * 10.0 * globalVolume);

    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(finalVolume, startTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  } catch (err) {
    console.warn('Feedback _playRawTone error:', err);
  }
}

// New low-level helper with ADSR envelope + optional frequency ramp + startDelay
function playTone({ waveform, frequency, duration, attack = 0.005, release = 0.05, gain = 0.2, frequencyRampTo, frequencyRampDuration, startDelay = 0 }) {
  if (!isAudioEnabled()) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const startTime = now + startDelay;
    const globalVolume = getAudioVolume();
    const finalGain = Math.min(1.0, gain * 10.0 * globalVolume);

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = waveform;
    osc.frequency.setValueAtTime(frequency, startTime);

    if (frequencyRampTo !== undefined) {
      const rampDur = frequencyRampDuration !== undefined ? frequencyRampDuration : duration;
      osc.frequency.linearRampToValueAtTime(frequencyRampTo, startTime + rampDur);
    }

    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(finalGain, startTime + attack);
    gainNode.gain.setValueAtTime(finalGain, startTime + duration - release);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  } catch (err) {
    console.warn('feedbackService playTone error:', err);
  }
}

function playSequence(notes) {
  notes.forEach(note => playTone(note));
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
  if (vol === null) return 0.8;
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
    _playRawTone(659.25, now, 0.08, 'sine', 0.15);
    _playRawTone(880, now + 0.08, 0.18, 'sine', 0.15);
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
    const finalVolume = Math.min(1.0, 0.2 * 10.0 * globalVolume);

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
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, index) => {
      _playRawTone(freq, now + index * 0.08, 0.15, 'sine', 0.15);
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
    _playRawTone(987.77, now, 0.06, 'sine', 0.12);
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
    const finalVolume = Math.min(1.0, 0.15 * 10.0 * globalVolume);

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

    _playRawTone(659.25, now + 0.03, 0.14, 'sine', 0.1);
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
    const freqs = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    freqs.forEach((f, idx) => {
      _playRawTone(f, now + idx * 0.07, 0.28, 'sine', 0.14);
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
    const freqs = [392.00, 349.23, 311.13, 261.63, 196.00];
    freqs.forEach((f, idx) => {
      _playRawTone(f, now + idx * 0.11, 0.35, 'triangle', 0.15);
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
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99];
    notes.forEach((freq, idx) => {
      _playRawTone(freq, now + idx * 0.05, 0.12, 'sine', 0.12);
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
    _playRawTone(987.77, now, 0.05, 'sine', 0.16);
    _playRawTone(1318.51, now + 0.04, 0.12, 'sine', 0.16);
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
    _playRawTone(1500, now, 0.012, 'sine', 0.08);
  } catch (err) {
    console.warn('feedbackService playSpeedrunTick error:', err);
  }
}

export function playSpeedrunComplete() {
  if (!isAudioEnabled()) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const notes = [392.00, 523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      _playRawTone(freq, now + idx * 0.05, 0.16, 'sine', 0.14);
    });
  } catch (err) {
    console.warn('feedbackService playSpeedrunComplete error:', err);
  }
}

// 3b. Context-specific feedback groups

export const quizFeedback = {
  correct: () => {
    if (!isAudioEnabled()) return;
    try {
      playTone({ waveform: 'sine', frequency: 880, duration: 0.08, gain: 0.2, startDelay: 0 });
      playTone({ waveform: 'sine', frequency: 1318, duration: 0.1, gain: 0.2, startDelay: 0.08 });
    } catch (err) {
      console.warn('quizFeedback.correct error:', err);
    }
  },
  wrong: () => {
    if (!isAudioEnabled()) return;
    try {
      playTone({ waveform: 'triangle', frequency: 220, duration: 0.15, gain: 0.2, frequencyRampTo: 180, frequencyRampDuration: 0.15 });
    } catch (err) {
      console.warn('quizFeedback.wrong error:', err);
    }
  }
};

export const ftbFeedback = {
  correct: () => {
    if (!isAudioEnabled()) return;
    try {
      playTone({ waveform: 'square', frequency: 1200, duration: 0.015, gain: 0.12, startDelay: 0 });
      playTone({ waveform: 'sine', frequency: 660, duration: 0.09, gain: 0.18, startDelay: 0.015 });
    } catch (err) {
      console.warn('ftbFeedback.correct error:', err);
    }
  },
  wrong: () => {
    if (!isAudioEnabled()) return;
    try {
      playTone({ waveform: 'triangle', frequency: 200, duration: 0.05, gain: 0.15, startDelay: 0 });
      playTone({ waveform: 'triangle', frequency: 180, duration: 0.06, gain: 0.15, startDelay: 0.055 });
    } catch (err) {
      console.warn('ftbFeedback.wrong error:', err);
    }
  }
};

export const flashcardFeedback = {
  easy: () => {
    if (!isAudioEnabled()) return;
    try {
      playSequence([
        { waveform: 'sine', frequency: 523.25, duration: 0.06, gain: 0.18, startDelay: 0 },
        { waveform: 'sine', frequency: 659.25, duration: 0.06, gain: 0.18, startDelay: 0.04 },
        { waveform: 'sine', frequency: 783.99, duration: 0.06, gain: 0.18, startDelay: 0.08 },
      ]);
    } catch (err) {
      console.warn('flashcardFeedback.easy error:', err);
    }
  },
  good: () => {
    if (!isAudioEnabled()) return;
    try {
      playSequence([
        { waveform: 'sine', frequency: 523.25, duration: 0.07, gain: 0.18, startDelay: 0 },
        { waveform: 'sine', frequency: 659.25, duration: 0.07, gain: 0.18, startDelay: 0.075 },
      ]);
    } catch (err) {
      console.warn('flashcardFeedback.good error:', err);
    }
  },
  hard: () => {
    if (!isAudioEnabled()) return;
    try {
      playTone({ waveform: 'sine', frequency: 440, duration: 0.09, gain: 0.15 });
    } catch (err) {
      console.warn('flashcardFeedback.hard error:', err);
    }
  },
  again: () => {
    if (!isAudioEnabled()) return;
    try {
      playTone({ waveform: 'triangle', frequency: 300, duration: 0.12, gain: 0.15, frequencyRampTo: 200, frequencyRampDuration: 0.12 });
    } catch (err) {
      console.warn('flashcardFeedback.again error:', err);
    }
  }
};

export const matchingFeedback = {
  correct: () => {
    if (!isAudioEnabled()) return;
    try {
      playTone({ waveform: 'sine', frequency: 587, duration: 0.1, gain: 0.2, startDelay: 0 });
      playTone({ waveform: 'sine', frequency: 880, duration: 0.1, gain: 0.2, startDelay: 0 });
    } catch (err) {
      console.warn('matchingFeedback.correct error:', err);
    }
  },
  wrong: () => {
    if (!isAudioEnabled()) return;
    try {
      playTone({ waveform: 'square', frequency: 400, duration: 0.1, gain: 0.1, startDelay: 0 });
      playTone({ waveform: 'square', frequency: 424, duration: 0.1, gain: 0.1, startDelay: 0 });
    } catch (err) {
      console.warn('matchingFeedback.wrong error:', err);
    }
  },
  complete: () => {
    if (!isAudioEnabled()) return;
    try {
      playSequence([
        { waveform: 'sine', frequency: 523.25, duration: 0.08, gain: 0.2, startDelay: 0 },
        { waveform: 'sine', frequency: 659.25, duration: 0.08, gain: 0.2, startDelay: 0.06 },
        { waveform: 'sine', frequency: 783.99, duration: 0.08, gain: 0.2, startDelay: 0.12 },
        { waveform: 'sine', frequency: 1046.5, duration: 0.08, gain: 0.2, startDelay: 0.18 },
      ]);
    } catch (err) {
      console.warn('matchingFeedback.complete error:', err);
    }
  }
};

export const bossBattleFeedback = {
  correct: () => {
    if (!isAudioEnabled()) return;
    try {
      playTone({ waveform: 'sawtooth', frequency: 660, duration: 0.12, gain: 0.18, frequencyRampTo: 740, frequencyRampDuration: 0.12 });
    } catch (err) {
      console.warn('bossBattleFeedback.correct error:', err);
    }
  },
  wrong: () => {
    if (!isAudioEnabled()) return;
    try {
      playTone({ waveform: 'sawtooth', frequency: 150, duration: 0.18, gain: 0.2, frequencyRampTo: 100, frequencyRampDuration: 0.18 });
    } catch (err) {
      console.warn('bossBattleFeedback.wrong error:', err);
    }
  },
  victory: () => {
    if (!isAudioEnabled()) return;
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      playSequence([
        { waveform: 'sawtooth', frequency: 523, duration: 0.1, gain: 0.15, startDelay: 0 },
        { waveform: 'sawtooth', frequency: 659, duration: 0.1, gain: 0.15, startDelay: 0.08 },
        { waveform: 'sawtooth', frequency: 784, duration: 0.1, gain: 0.15, startDelay: 0.16 },
        { waveform: 'sine', frequency: 1047, duration: 0.15, gain: 0.18, startDelay: 0.24 },
      ]);
      // Add vibrato on final note
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 25;
      lfoGain.gain.value = 8;
      lfo.connect(lfoGain);
      // Connect LFO to a dedicated sine oscillator for the sustained note
      const finalOsc = ctx.createOscillator();
      const finalGain = ctx.createGain();
      finalOsc.type = 'sine';
      finalOsc.frequency.setValueAtTime(1047, now + 0.24);
      const finalVibGain = Math.min(1.0, 0.18 * 10.0 * getAudioVolume());
      finalGain.gain.setValueAtTime(0, now + 0.24);
      finalGain.gain.linearRampToValueAtTime(finalVibGain, now + 0.245);
      finalGain.gain.setValueAtTime(finalVibGain, now + 0.36);
      finalGain.gain.exponentialRampToValueAtTime(0.001, now + 0.39);
      lfoGain.connect(finalOsc.frequency);
      finalOsc.connect(finalGain);
      finalGain.connect(ctx.destination);
      finalOsc.start(now + 0.24);
      finalOsc.stop(now + 0.39);
      lfo.start(now + 0.24);
      lfo.stop(now + 0.39);
    } catch (err) {
      console.warn('bossBattleFeedback.victory error:', err);
    }
  },
  defeat: () => {
    if (!isAudioEnabled()) return;
    try {
      playSequence([
        { waveform: 'triangle', frequency: 440, duration: 0.12, gain: 0.15, startDelay: 0 },
        { waveform: 'triangle', frequency: 370, duration: 0.12, gain: 0.15, startDelay: 0.1 },
        { waveform: 'triangle', frequency: 311, duration: 0.15, gain: 0.15, startDelay: 0.2 },
      ]);
    } catch (err) {
      console.warn('bossBattleFeedback.defeat error:', err);
    }
  }
};

export const datasetChallengeFeedback = {
  runSuccess: () => {
    if (!isAudioEnabled()) return;
    try {
      playTone({ waveform: 'sine', frequency: 740, duration: 0.06, gain: 0.1 });
    } catch (err) {
      console.warn('datasetChallengeFeedback.runSuccess error:', err);
    }
  },
  runError: () => {
    if (!isAudioEnabled()) return;
    try {
      playTone({ waveform: 'square', frequency: 180, duration: 0.09, gain: 0.1 });
    } catch (err) {
      console.warn('datasetChallengeFeedback.runError error:', err);
    }
  },
  submitPass: () => {
    if (!isAudioEnabled()) return;
    try {
      playSequence([
        { waveform: 'square', frequency: 523, duration: 0.06, gain: 0.12, startDelay: 0 },
        { waveform: 'square', frequency: 784, duration: 0.06, gain: 0.12, startDelay: 0.07 },
        { waveform: 'sine', frequency: 1047, duration: 0.08, gain: 0.15, startDelay: 0.14 },
        { waveform: 'sine', frequency: 1568, duration: 0.08, gain: 0.1, startDelay: 0.14 },
      ]);
    } catch (err) {
      console.warn('datasetChallengeFeedback.submitPass error:', err);
    }
  },
  submitFail: () => {
    if (!isAudioEnabled()) return;
    try {
      playSequence([
        { waveform: 'triangle', frequency: 300, duration: 0.08, gain: 0.12, startDelay: 0 },
        { waveform: 'triangle', frequency: 280, duration: 0.08, gain: 0.12, startDelay: 0.09 },
      ]);
    } catch (err) {
      console.warn('datasetChallengeFeedback.submitFail error:', err);
    }
  }
};

export const timerFeedback = {
  expire: () => {
    if (!isAudioEnabled()) return;
    try {
      playSequence([
        { waveform: 'sine', frequency: 587, duration: 0.12, gain: 0.15, startDelay: 0 },
        { waveform: 'sine', frequency: 587, duration: 0.12, gain: 0.15, startDelay: 0.27 },
      ]);
    } catch (err) {
      console.warn('timerFeedback.expire error:', err);
    }
  }
};

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
