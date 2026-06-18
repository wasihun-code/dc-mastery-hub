function sm2Update(card, score) {
  let q = 3
  if (score >= 1.0) q = 5
  else if (score >= 0.8) q = 4
  else if (score >= 0.5) q = 3
  else q = 1

  let reps = card.repetitions
  let interval = card.interval_days
  let ease = card.ease_factor

  if (q < 3) {
    reps = 0
    interval = 1
  } else {
    if (reps === 0) {
      interval = 1
    } else if (reps === 1) {
      interval = 6
    } else {
      interval = Math.round(interval * ease)
    }
    reps += 1
  }

  ease = ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  if (ease < 1.3) ease = 1.3

  return { repetitions: reps, interval_days: interval, ease_factor: Math.round(ease * 100) / 100 }
}

describe('SM-2 Algorithm', () => {
  const defaultCard = { repetitions: 0, interval_days: 1, ease_factor: 2.5 }

  describe('Quality mapping from score', () => {
    test('score >= 1.0 maps to quality 5', () => {
      const r = sm2Update(defaultCard, 1.0)
      expect(r.repetitions).toBe(1)
      expect(r.interval_days).toBe(1)
      expect(r.ease_factor).toBe(2.6)
    })

    test('score = 0.9 maps to quality 4', () => {
      const r = sm2Update(defaultCard, 0.9)
      expect(r.repetitions).toBe(1)
      expect(r.interval_days).toBe(1)
      expect(r.ease_factor).toBe(2.5)
    })

    test('score = 0.5 maps to quality 3', () => {
      const r = sm2Update(defaultCard, 0.5)
      expect(r.repetitions).toBe(1)
      expect(r.interval_days).toBe(1)
      expect(r.ease_factor).toBe(2.36)
    })

    test('score < 0.5 maps to quality 1 (reset)', () => {
      const r = sm2Update(defaultCard, 0.4)
      expect(r.repetitions).toBe(0)
      expect(r.interval_days).toBe(1)
      expect(r.ease_factor).toBe(1.96)
    })
  })

  describe('Interval calculation', () => {
    test('first repetition (reps=0) with q>=3 gives interval=1', () => {
      const r = sm2Update(defaultCard, 0.9)
      expect(r.interval_days).toBe(1)
      expect(r.repetitions).toBe(1)
    })

    test('second repetition (reps=1) with q>=3 gives interval=6', () => {
      const card = { repetitions: 1, interval_days: 1, ease_factor: 2.5 }
      const r = sm2Update(card, 0.9)
      expect(r.interval_days).toBe(6)
      expect(r.repetitions).toBe(2)
    })

    test('third+ repetition multiplies interval by ease factor', () => {
      const card = { repetitions: 2, interval_days: 6, ease_factor: 2.5 }
      const r = sm2Update(card, 0.9)
      expect(r.interval_days).toBe(15)
      expect(r.repetitions).toBe(3)
    })
  })

  describe('Ease factor calculations', () => {
    test('quality 5 increases EF', () => {
      const r = sm2Update(defaultCard, 1.0)
      expect(r.ease_factor).toBeGreaterThan(2.5)
    })

    test('quality 4 keeps EF nearly unchanged', () => {
      const r = sm2Update(defaultCard, 0.9)
      expect(r.ease_factor).toBe(2.5)
    })

    test('quality 3 decreases EF', () => {
      const r = sm2Update(defaultCard, 0.5)
      expect(r.ease_factor).toBeLessThan(2.5)
    })

    test('quality 1 decreases EF more', () => {
      const r = sm2Update(defaultCard, 0.4)
      expect(r.ease_factor).toBeLessThan(2.3)
    })
  })

  describe('EF floor at 1.3', () => {
    test('EF never goes below 1.3', () => {
      let card = { ...defaultCard }
      for (let i = 0; i < 20; i++) {
        card = { ...card, ...sm2Update(card, 0.0) }
      }
      expect(card.ease_factor).toBeGreaterThanOrEqual(1.3)
    })

    test('multiple low scores hit the floor', () => {
      let card = { ...defaultCard }
      for (let i = 0; i < 10; i++) {
        const r = sm2Update(card, 0.0)
        card = { ...card, ...r }
      }
      const r = sm2Update(card, 0.0)
      expect(r.ease_factor).toBe(1.3)
    })
  })

  describe('Repetition reset on quality < 3', () => {
    test('high repetition count resets to 0 on poor score', () => {
      const card = { repetitions: 10, interval_days: 100, ease_factor: 2.5 }
      const r = sm2Update(card, 0.0)
      expect(r.repetitions).toBe(0)
      expect(r.interval_days).toBe(1)
    })

    test('interval resets to 1 after poor score', () => {
      const card = { repetitions: 5, interval_days: 60, ease_factor: 2.5 }
      const r = sm2Update(card, 0.3)
      expect(r.interval_days).toBe(1)
      expect(r.repetitions).toBe(0)
    })
  })

  describe('Full user scenario', () => {
    test('quality 5 → interval=1, EF≈2.6, repetitions=1', () => {
      const r = sm2Update(defaultCard, 1.0)
      expect(r.repetitions).toBe(1)
      expect(r.interval_days).toBe(1)
      expect(r.ease_factor).toBe(2.6)
    })

    test('card gradually increases interval over successive quality-4 reviews', () => {
      let card = { ...defaultCard }
      const intervals = []
      for (let i = 0; i < 5; i++) {
        const r = sm2Update(card, 0.85)
        intervals.push(r.interval_days)
        card = { ...card, ...r }
      }
      expect(intervals[0]).toBe(1)
      expect(intervals[1]).toBe(6)
      expect(intervals[2]).toBeGreaterThan(6)
      expect(intervals[3]).toBeGreaterThan(intervals[2])
      expect(intervals[4]).toBeGreaterThan(intervals[3])
    })
  })
})
