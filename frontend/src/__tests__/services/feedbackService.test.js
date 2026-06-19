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
        'quizFeedback',
        'ftbFeedback',
        'flashcardFeedback',
        'matchingFeedback',
        'bossBattleFeedback',
        'datasetChallengeFeedback',
        'timerFeedback',
      ];
      expected.forEach((name) => {
        expect(feedbackService[name]).toBeDefined();
      });
      const exportedNames = Object.keys(feedbackService);
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

  describe('context-specific feedback', () => {
    it('quizFeedback.correct and quizFeedback.wrong are defined', () => {
      expect(feedbackService.quizFeedback.correct).toBeDefined();
      expect(typeof feedbackService.quizFeedback.correct).toBe('function');
      expect(feedbackService.quizFeedback.wrong).toBeDefined();
      expect(typeof feedbackService.quizFeedback.wrong).toBe('function');
    });

    it('ftbFeedback.correct and ftbFeedback.wrong are defined', () => {
      expect(feedbackService.ftbFeedback.correct).toBeDefined();
      expect(typeof feedbackService.ftbFeedback.correct).toBe('function');
      expect(feedbackService.ftbFeedback.wrong).toBeDefined();
      expect(typeof feedbackService.ftbFeedback.wrong).toBe('function');
    });

    it('flashcardFeedback has 4 functions (easy/good/hard/again)', () => {
      const keys = ['easy', 'good', 'hard', 'again'];
      keys.forEach(k => {
        expect(feedbackService.flashcardFeedback[k]).toBeDefined();
        expect(typeof feedbackService.flashcardFeedback[k]).toBe('function');
      });
      expect(Object.keys(feedbackService.flashcardFeedback).length).toBe(keys.length);
    });

    it('matchingFeedback has 3 functions (correct/wrong/complete)', () => {
      const keys = ['correct', 'wrong', 'complete'];
      keys.forEach(k => {
        expect(feedbackService.matchingFeedback[k]).toBeDefined();
        expect(typeof feedbackService.matchingFeedback[k]).toBe('function');
      });
      expect(Object.keys(feedbackService.matchingFeedback).length).toBe(keys.length);
    });

    it('bossBattleFeedback has 4 functions (correct/wrong/victory/defeat)', () => {
      const keys = ['correct', 'wrong', 'victory', 'defeat'];
      keys.forEach(k => {
        expect(feedbackService.bossBattleFeedback[k]).toBeDefined();
        expect(typeof feedbackService.bossBattleFeedback[k]).toBe('function');
      });
      expect(Object.keys(feedbackService.bossBattleFeedback).length).toBe(keys.length);
    });

    it('datasetChallengeFeedback has 4 functions (runSuccess/runError/submitPass/submitFail)', () => {
      const keys = ['runSuccess', 'runError', 'submitPass', 'submitFail'];
      keys.forEach(k => {
        expect(feedbackService.datasetChallengeFeedback[k]).toBeDefined();
        expect(typeof feedbackService.datasetChallengeFeedback[k]).toBe('function');
      });
      expect(Object.keys(feedbackService.datasetChallengeFeedback).length).toBe(keys.length);
    });

    it('timerFeedback.expire is defined', () => {
      expect(feedbackService.timerFeedback.expire).toBeDefined();
      expect(typeof feedbackService.timerFeedback.expire).toBe('function');
    });

    it('quizFeedback.correct() calls AudioContext', () => {
      vi.clearAllMocks();
      feedbackService.quizFeedback.correct();
      expect(window.AudioContext).toHaveBeenCalledTimes(1);
      const ctx = window.AudioContext.mock.results[0].value;
      expect(ctx.createOscillator).toHaveBeenCalled();
    });

    it('matchingFeedback.correct() creates 2 simultaneous oscillators', () => {
      vi.clearAllMocks();
      feedbackService.matchingFeedback.correct();
      const ctx = window.AudioContext.mock.results[0].value;
      expect(ctx.createOscillator).toHaveBeenCalledTimes(2);
    });

    it('muted state prevents all feedback functions from playing', () => {
      localStorage.setItem('feedback_audio_enabled', 'false');
      vi.clearAllMocks();
      feedbackService.quizFeedback.correct();
      feedbackService.quizFeedback.wrong();
      feedbackService.ftbFeedback.correct();
      feedbackService.ftbFeedback.wrong();
      feedbackService.flashcardFeedback.easy();
      feedbackService.flashcardFeedback.good();
      feedbackService.flashcardFeedback.hard();
      feedbackService.flashcardFeedback.again();
      feedbackService.matchingFeedback.correct();
      feedbackService.matchingFeedback.wrong();
      feedbackService.matchingFeedback.complete();
      feedbackService.bossBattleFeedback.correct();
      feedbackService.bossBattleFeedback.wrong();
      feedbackService.bossBattleFeedback.victory();
      feedbackService.bossBattleFeedback.defeat();
      feedbackService.datasetChallengeFeedback.runSuccess();
      feedbackService.datasetChallengeFeedback.runError();
      feedbackService.datasetChallengeFeedback.submitPass();
      feedbackService.datasetChallengeFeedback.submitFail();
      feedbackService.timerFeedback.expire();
      expect(window.AudioContext).not.toHaveBeenCalled();
    });

    it('volume strength scales the gain', () => {
      localStorage.setItem('feedback_audio_enabled', 'true');
      localStorage.setItem('feedback_audio_volume', '0.5');
      vi.clearAllMocks();
      feedbackService.quizFeedback.correct();
      const ctx = window.AudioContext.mock.results[0].value;
      expect(ctx.createOscillator).toHaveBeenCalled();
      expect(ctx.createGain).toHaveBeenCalled();
    });
  });
});
