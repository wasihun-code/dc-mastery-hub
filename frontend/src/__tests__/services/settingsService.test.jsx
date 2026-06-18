import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';

describe('settingsService', () => {
  let service;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    localStorage.clear();
    service = await import('../../services/settingsService');
  });

  describe('exports', () => {
    it('should export all expected functions', () => {
      const expected = [
        'getSessionQuestionCount',
        'setSessionQuestionCount',
        'getDisabledSessionCourses',
        'toggleSessionModeForCourse',
        'getDisabledSessionTracks',
        'toggleSessionModeForTrack',
        'getDisabledSessionCategories',
        'toggleSessionModeForCategory',
        'isSessionModeDisabled',
        'getSessionLimit',
      ];
      expected.forEach((name) => {
        expect(service[name]).toBeDefined();
        expect(typeof service[name]).toBe('function');
      });
      const exportedNames = Object.keys(service).filter(
        (k) => typeof service[k] === 'function',
      );
      expect(exportedNames.length).toBe(expected.length);
    });
  });

  describe('getSessionQuestionCount / setSessionQuestionCount', () => {
    it('returns default value 10 when localStorage is empty', () => {
      expect(service.getSessionQuestionCount()).toBe(10);
    });

    it('returns parsed value when localStorage has a valid number', () => {
      localStorage.setItem('sessionQuestionCount', '25');
      expect(service.getSessionQuestionCount()).toBe(25);
    });

    it('returns NaN when localStorage has invalid string', () => {
      localStorage.setItem('sessionQuestionCount', 'abc');
      expect(service.getSessionQuestionCount()).toBeNaN();
    });

    it('setSessionQuestionCount writes the value to localStorage', () => {
      service.setSessionQuestionCount(15);
      expect(localStorage.getItem('sessionQuestionCount')).toBe('15');
    });

    it('setSessionQuestionCount clamps values below 1 to 1', () => {
      const result = service.setSessionQuestionCount(0);
      expect(result).toBe(1);
      expect(localStorage.getItem('sessionQuestionCount')).toBe('1');
    });

    it('setSessionQuestionCount clamps values above 100 to 100', () => {
      const result = service.setSessionQuestionCount(200);
      expect(result).toBe(100);
      expect(localStorage.getItem('sessionQuestionCount')).toBe('100');
    });

    it('setSessionQuestionCount returns the clamped value', () => {
      const result = service.setSessionQuestionCount(-5);
      expect(result).toBe(1);
    });
  });

  describe('getDisabledSessionCourses / toggleSessionModeForCourse', () => {
    it('returns empty array when localStorage is empty', () => {
      expect(service.getDisabledSessionCourses()).toEqual([]);
    });

    it('returns empty array when localStorage has invalid JSON', () => {
      localStorage.setItem('disabledSessionCourses', 'not-json');
      expect(service.getDisabledSessionCourses()).toEqual([]);
    });

    it('toggleSessionModeForCourse adds a course slug to the list', () => {
      const result = service.toggleSessionModeForCourse('python-101');
      expect(result).toEqual(['python-101']);
      expect(service.getDisabledSessionCourses()).toEqual(['python-101']);
    });

    it('toggleSessionModeForCourse removes an existing course slug', () => {
      localStorage.setItem('disabledSessionCourses', JSON.stringify(['python-101', 'js-fundamentals']));
      const result = service.toggleSessionModeForCourse('python-101');
      expect(result).toEqual(['js-fundamentals']);
      expect(service.getDisabledSessionCourses()).toEqual(['js-fundamentals']);
    });

    it('toggleSessionModeForCourse toggles the same slug idempotently', () => {
      service.toggleSessionModeForCourse('data-science');
      expect(service.getDisabledSessionCourses()).toEqual(['data-science']);
      service.toggleSessionModeForCourse('data-science');
      expect(service.getDisabledSessionCourses()).toEqual([]);
    });

    it('handles malformed JSON gracefully before toggling', () => {
      localStorage.setItem('disabledSessionCourses', 'broken]json');
      const result = service.toggleSessionModeForCourse('ml-basics');
      expect(result).toEqual(['ml-basics']);
    });
  });

  describe('getDisabledSessionTracks / toggleSessionModeForTrack', () => {
    it('returns empty array when localStorage is empty', () => {
      expect(service.getDisabledSessionTracks()).toEqual([]);
    });

    it('returns empty array when localStorage has invalid JSON', () => {
      localStorage.setItem('disabledSessionTracks', 'bad');
      expect(service.getDisabledSessionTracks()).toEqual([]);
    });

    it('toggleSessionModeForTrack adds a track slug', () => {
      const result = service.toggleSessionModeForTrack('track-alpha');
      expect(result).toEqual(['track-alpha']);
      expect(service.getDisabledSessionTracks()).toEqual(['track-alpha']);
    });

    it('toggleSessionModeForTrack removes an existing track slug', () => {
      localStorage.setItem('disabledSessionTracks', JSON.stringify(['track-alpha', 'track-beta']));
      service.toggleSessionModeForTrack('track-alpha');
      expect(service.getDisabledSessionTracks()).toEqual(['track-beta']);
    });

    it('toggleSessionModeForTrack toggles idempotently', () => {
      service.toggleSessionModeForTrack('track-one');
      expect(service.getDisabledSessionTracks()).toEqual(['track-one']);
      service.toggleSessionModeForTrack('track-one');
      expect(service.getDisabledSessionTracks()).toEqual([]);
    });
  });

  describe('getDisabledSessionCategories / toggleSessionModeForCategory', () => {
    it('returns empty array when localStorage is empty', () => {
      expect(service.getDisabledSessionCategories()).toEqual([]);
    });

    it('returns empty array when localStorage has invalid JSON', () => {
      localStorage.setItem('disabledSessionCategories', '{{{');
      expect(service.getDisabledSessionCategories()).toEqual([]);
    });

    it('toggleSessionModeForCategory adds a category', () => {
      const result = service.toggleSessionModeForCategory('flashcard');
      expect(result).toEqual(['flashcard']);
      expect(service.getDisabledSessionCategories()).toEqual(['flashcard']);
    });

    it('toggleSessionModeForCategory removes an existing category', () => {
      localStorage.setItem('disabledSessionCategories', JSON.stringify(['quiz', 'flashcard']));
      service.toggleSessionModeForCategory('quiz');
      expect(service.getDisabledSessionCategories()).toEqual(['flashcard']);
    });

    it('toggleSessionModeForCategory toggles idempotently', () => {
      service.toggleSessionModeForCategory('boss');
      expect(service.getDisabledSessionCategories()).toEqual(['boss']);
      service.toggleSessionModeForCategory('boss');
      expect(service.getDisabledSessionCategories()).toEqual([]);
    });
  });

  describe('isSessionModeDisabled', () => {
    it('returns false when nothing is disabled', () => {
      expect(service.isSessionModeDisabled('quiz', 'python-101', 'track-x')).toBe(false);
    });

    it('returns true when category is disabled', () => {
      service.toggleSessionModeForCategory('flashcard');
      expect(service.isSessionModeDisabled('flashcard', null, null)).toBe(true);
    });

    it('returns true when course slug is disabled', () => {
      service.toggleSessionModeForCourse('python-101');
      expect(service.isSessionModeDisabled(null, 'python-101', null)).toBe(true);
    });

    it('returns true when track slug is disabled', () => {
      service.toggleSessionModeForTrack('track-x');
      expect(service.isSessionModeDisabled(null, null, 'track-x')).toBe(true);
    });

    it('returns false when all arguments are null/undefined', () => {
      expect(service.isSessionModeDisabled()).toBe(false);
    });

    it('returns false when a different category/course/track is disabled', () => {
      service.toggleSessionModeForCategory('quiz');
      service.toggleSessionModeForCourse('python-101');
      expect(service.isSessionModeDisabled('flashcard', 'js-fundamentals', 'track-y')).toBe(false);
    });

    it('category check takes priority over course/track', () => {
      service.toggleSessionModeForCategory('flashcard');
      service.toggleSessionModeForCourse('python-101');
      expect(service.isSessionModeDisabled('flashcard', 'python-101', null)).toBe(true);
    });
  });

  describe('getSessionLimit', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('returns totalCount when session mode is disabled', () => {
      service.toggleSessionModeForCourse('python-101');
      const limit = service.getSessionLimit(null, 'python-101', null, 50);
      expect(limit).toBe(50);
    });

    it('returns base count (10) for non-flashcard categories', () => {
      const limit = service.getSessionLimit('quiz', null, null, 100);
      expect(limit).toBe(10);
    });

    it('returns base count + 5 for flashcard category', () => {
      const limit = service.getSessionLimit('flashcard', null, null, 100);
      expect(limit).toBe(15);
    });

    it('returns base count + 5 for "flashcards" category', () => {
      const limit = service.getSessionLimit('flashcards', null, null, 100);
      expect(limit).toBe(15);
    });

    it('uses custom session question count', () => {
      service.setSessionQuestionCount(25);
      const limit = service.getSessionLimit(null, null, null, 100);
      expect(limit).toBe(25);
    });

    it('flashcard gets custom base count + 5', () => {
      service.setSessionQuestionCount(20);
      const limit = service.getSessionLimit('flashcard', null, null, 100);
      expect(limit).toBe(25);
    });

    it('disabled mode overrides everything and returns totalCount', () => {
      service.setSessionQuestionCount(5);
      service.toggleSessionModeForCategory('flashcard');
      const limit = service.getSessionLimit('flashcard', null, null, 999);
      expect(limit).toBe(999);
    });
  });

  describe('MemoryRouter integration', () => {
    function TestConsumer() {
      const count = service.getSessionQuestionCount();
      const courses = service.getDisabledSessionCourses();
      return (
        <div>
          <span data-testid="count">{count}</span>
          <span data-testid="courses">{JSON.stringify(courses)}</span>
        </div>
      );
    }

    it('renders inside MemoryRouter without crashing', () => {
      const { getByTestId } = render(
        <MemoryRouter>
          <TestConsumer />
        </MemoryRouter>,
      );
      expect(getByTestId('count')).toHaveTextContent('10');
      expect(getByTestId('courses')).toHaveTextContent('[]');
    });

    it('reflects localStorage changes when re-rendered inside MemoryRouter', () => {
      service.setSessionQuestionCount(42);
      service.toggleSessionModeForCourse('data-science');
      const { getByTestId } = render(
        <MemoryRouter>
          <TestConsumer />
        </MemoryRouter>,
      );
      expect(getByTestId('count')).toHaveTextContent('42');
      expect(getByTestId('courses')).toHaveTextContent('["data-science"]');
    });

    it('works within MemoryRouter with initialEntries', () => {
      service.setSessionQuestionCount(7);
      const { getByTestId } = render(
        <MemoryRouter initialEntries={['/study']}>
          <TestConsumer />
        </MemoryRouter>,
      );
      expect(getByTestId('count')).toHaveTextContent('7');
    });
  });
});
