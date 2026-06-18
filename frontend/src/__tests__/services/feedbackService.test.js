import { describe, it, expect, beforeEach, vi } from 'vitest';

if (!navigator.vibrate) {
  Object.defineProperty(navigator, 'vibrate', {
    value: vi.fn(),
    configurable: true,
    writable: true,
  });
}

const createMockOsc = () => ({
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  frequency: {
    value: 440,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  },
  type: '',
});

const createMockGain = () => ({
  connect: vi.fn(),
  gain: {
    value: 0,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  },
});

window.AudioContext = vi.fn().mockImplementation(function () {
  return {
    createOscillator: vi.fn(createMockOsc),
    createGain: vi.fn(createMockGain),
    destination: {},
    currentTime: 0,
    state: 'running',
    resume: vi.fn(),
    close: vi.fn(),
  };
});

window.webkitAudioContext = window.AudioContext;

describe('feedbackService', () => {
  let feedbackService;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    localStorage.clear();
    feedbackService = await import('../../services/feedbackService');
  });

  describe('exports', () => {
    it('should export all expected functions', () => {
      const expected = [
        'isAudioEnabled',
        'setAudioEnabled',
        'getAudioVolume',
        'setAudioVolume',
        'isHapticsEnabled',
        'setHapticsEnabled',
        'playCorrect',
        'playWrong',
        'playSuccess',
        'playTimerWarning',
        'playTimerExpired',
        'playBossAttack',
        'playBossDamage',
        'playBossVictory',
        'playBossDefeat',
        'playBossWaveComplete',
        'playSpeedrunCorrect',
        'playSpeedrunWrong',
        'playSpeedrunTick',
        'playSpeedrunComplete',
        'vibrateCorrect',
        'vibrateWrong',
        'vibrateSuccess',
        'vibrateTimerWarning',
        'vibrateTimerExpired',
        'triggerCorrectFeedback',
        'triggerWrongFeedback',
        'triggerSuccessFeedback',
        'triggerTimerWarningFeedback',
        'triggerTimerExpiredFeedback',
        'triggerBossAttackFeedback',
        'triggerBossDamageFeedback',
        'triggerBossVictoryFeedback',
        'triggerBossDefeatFeedback',
        'triggerBossWaveCompleteFeedback',
        'triggerSpeedrunCorrectFeedback',
        'triggerSpeedrunWrongFeedback',
        'triggerSpeedrunTickFeedback',
        'triggerSpeedrunCompleteFeedback',
      ];
      expected.forEach((name) => {
        expect(feedbackService[name]).toBeDefined();
        expect(typeof feedbackService[name]).toBe('function');
      });
      const exportedNames = Object.keys(feedbackService).filter(
        (k) => typeof feedbackService[k] === 'function',
      );
      expect(exportedNames.length).toBe(expected.length);
    });
  });

  describe('localStorage helpers', () => {
    it('isAudioEnabled returns true by default', () => {
      expect(feedbackService.isAudioEnabled()).toBe(true);
    });

    it('setAudioEnabled(false) makes isAudioEnabled return false', () => {
      feedbackService.setAudioEnabled(false);
      expect(feedbackService.isAudioEnabled()).toBe(false);
    });

    it('getAudioVolume returns 0.8 by default', () => {
      expect(feedbackService.getAudioVolume()).toBe(0.8);
    });

    it('setAudioVolume persists the value', () => {
      feedbackService.setAudioVolume(0.3);
      expect(feedbackService.getAudioVolume()).toBe(0.3);
    });

    it('isHapticsEnabled returns true by default', () => {
      expect(feedbackService.isHapticsEnabled()).toBe(true);
    });

    it('setHapticsEnabled(false) makes isHapticsEnabled return false', () => {
      feedbackService.setHapticsEnabled(false);
      expect(feedbackService.isHapticsEnabled()).toBe(false);
    });
  });

  describe('AudioContext integration', () => {
    it('playCorrect calls AudioContext when audio is enabled', () => {
      feedbackService.playCorrect();
      expect(window.AudioContext).toHaveBeenCalledTimes(1);
    });

    it('playCorrect creates oscillator and gain nodes', () => {
      feedbackService.playCorrect();
      const ctx = window.AudioContext.mock.results[0].value;
      expect(ctx.createOscillator).toHaveBeenCalledTimes(2);
      expect(ctx.createGain).toHaveBeenCalledTimes(2);
    });

    it('playCorrect does nothing when audio is disabled', () => {
      localStorage.setItem('feedback_audio_enabled', 'false');
      feedbackService.playCorrect();
      expect(window.AudioContext).not.toHaveBeenCalled();
    });

    it('playWrong calls AudioContext when audio is enabled', () => {
      feedbackService.playWrong();
      expect(window.AudioContext).toHaveBeenCalledTimes(1);
      const ctx = window.AudioContext.mock.results[0].value;
      expect(ctx.createOscillator).toHaveBeenCalledTimes(1);
      expect(ctx.createGain).toHaveBeenCalledTimes(1);
    });

    it('playWrong does nothing when audio is disabled', () => {
      localStorage.setItem('feedback_audio_enabled', 'false');
      feedbackService.playWrong();
      expect(window.AudioContext).not.toHaveBeenCalled();
    });

    it('playSuccess creates 4 oscillators and gain nodes (4 notes)', () => {
      feedbackService.playSuccess();
      const ctx = window.AudioContext.mock.results[0].value;
      expect(ctx.createOscillator).toHaveBeenCalledTimes(4);
      expect(ctx.createGain).toHaveBeenCalledTimes(4);
    });

    it('playTimerWarning calls AudioContext when audio is enabled', () => {
      feedbackService.playTimerWarning();
      expect(window.AudioContext).toHaveBeenCalledTimes(1);
    });

    it('playTimerExpired calls AudioContext when audio is enabled', () => {
      feedbackService.playTimerExpired();
      expect(window.AudioContext).toHaveBeenCalledTimes(1);
    });

    it('boss audio functions call AudioContext', () => {
      feedbackService.playBossAttack();
      expect(window.AudioContext).toHaveBeenCalledTimes(1);
    });

    it('speedrun audio functions call AudioContext', () => {
      feedbackService.playSpeedrunCorrect();
      expect(window.AudioContext).toHaveBeenCalledTimes(1);
    });
  });

  describe('haptic integration', () => {
    it('vibrateCorrect calls navigator.vibrate with [60]', () => {
      feedbackService.vibrateCorrect();
      expect(navigator.vibrate).toHaveBeenCalledWith([60]);
    });

    it('vibrateWrong calls navigator.vibrate with [150]', () => {
      feedbackService.vibrateWrong();
      expect(navigator.vibrate).toHaveBeenCalledWith([150]);
    });

    it('vibrateSuccess calls navigator.vibrate with [80, 50, 80]', () => {
      feedbackService.vibrateSuccess();
      expect(navigator.vibrate).toHaveBeenCalledWith([80, 50, 80]);
    });

    it('vibrateTimerWarning calls navigator.vibrate with [50]', () => {
      feedbackService.vibrateTimerWarning();
      expect(navigator.vibrate).toHaveBeenCalledWith([50]);
    });

    it('vibrateTimerExpired calls navigator.vibrate with [250]', () => {
      feedbackService.vibrateTimerExpired();
      expect(navigator.vibrate).toHaveBeenCalledWith([250]);
    });

    it('does not vibrate when haptics are disabled', () => {
      localStorage.setItem('feedback_haptics_enabled', 'false');
      feedbackService.vibrateCorrect();
      expect(navigator.vibrate).not.toHaveBeenCalled();
    });
  });

  describe('trigger convenience methods', () => {
    it('triggerCorrectFeedback plays audio and vibrates', () => {
      feedbackService.triggerCorrectFeedback();
      expect(window.AudioContext).toHaveBeenCalledTimes(1);
      expect(navigator.vibrate).toHaveBeenCalledWith([60]);
    });

    it('triggerWrongFeedback plays audio and vibrates', () => {
      feedbackService.triggerWrongFeedback();
      expect(window.AudioContext).toHaveBeenCalledTimes(1);
      expect(navigator.vibrate).toHaveBeenCalledWith([150]);
    });

    it('triggerSuccessFeedback plays audio and vibrates', () => {
      feedbackService.triggerSuccessFeedback();
      expect(window.AudioContext).toHaveBeenCalledTimes(1);
      expect(navigator.vibrate).toHaveBeenCalledWith([80, 50, 80]);
    });

    it('triggerTimerWarningFeedback plays audio and vibrates', () => {
      feedbackService.triggerTimerWarningFeedback();
      expect(window.AudioContext).toHaveBeenCalledTimes(1);
      expect(navigator.vibrate).toHaveBeenCalledWith([50]);
    });

    it('triggerTimerExpiredFeedback plays audio and vibrates', () => {
      feedbackService.triggerTimerExpiredFeedback();
      expect(window.AudioContext).toHaveBeenCalledTimes(1);
      expect(navigator.vibrate).toHaveBeenCalledWith([250]);
    });

    it('triggerBossAttackFeedback plays audio and vibrates', () => {
      feedbackService.triggerBossAttackFeedback();
      expect(window.AudioContext).toHaveBeenCalledTimes(1);
      expect(navigator.vibrate).toHaveBeenCalledWith([35, 25, 45]);
    });

    it('triggerBossDamageFeedback plays audio and vibrates', () => {
      feedbackService.triggerBossDamageFeedback();
      expect(window.AudioContext).toHaveBeenCalledTimes(1);
      expect(navigator.vibrate).toHaveBeenCalledWith([130, 70, 130]);
    });

    it('triggerBossVictoryFeedback plays audio and vibrates', () => {
      feedbackService.triggerBossVictoryFeedback();
      expect(window.AudioContext).toHaveBeenCalledTimes(1);
      expect(navigator.vibrate).toHaveBeenCalledWith([120, 60, 120, 60, 180]);
    });

    it('triggerBossDefeatFeedback plays audio and vibrates', () => {
      feedbackService.triggerBossDefeatFeedback();
      expect(window.AudioContext).toHaveBeenCalledTimes(1);
      expect(navigator.vibrate).toHaveBeenCalledWith([320]);
    });

    it('triggerBossWaveCompleteFeedback plays audio and vibrates', () => {
      feedbackService.triggerBossWaveCompleteFeedback();
      expect(window.AudioContext).toHaveBeenCalledTimes(1);
      expect(navigator.vibrate).toHaveBeenCalledWith([70, 50, 130]);
    });

    it('triggerSpeedrunCorrectFeedback plays audio and vibrates', () => {
      feedbackService.triggerSpeedrunCorrectFeedback();
      expect(window.AudioContext).toHaveBeenCalledTimes(1);
      expect(navigator.vibrate).toHaveBeenCalledWith([35]);
    });

    it('triggerSpeedrunWrongFeedback plays audio and vibrates', () => {
      feedbackService.triggerSpeedrunWrongFeedback();
      expect(window.AudioContext).toHaveBeenCalledTimes(1);
      expect(navigator.vibrate).toHaveBeenCalledWith([95]);
    });

    it('triggerSpeedrunTickFeedback plays audio and vibrates', () => {
      feedbackService.triggerSpeedrunTickFeedback();
      expect(window.AudioContext).toHaveBeenCalledTimes(1);
      expect(navigator.vibrate).toHaveBeenCalledWith([12]);
    });

    it('triggerSpeedrunCompleteFeedback plays audio and vibrates', () => {
      feedbackService.triggerSpeedrunCompleteFeedback();
      expect(window.AudioContext).toHaveBeenCalledTimes(1);
      expect(navigator.vibrate).toHaveBeenCalledWith([70, 50, 70, 50, 90]);
    });
  });
});
