import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import ExerciseTimer from '../../components/ExerciseTimer';

describe('ExerciseTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders initial duration in M:SS format', () => {
    render(<ExerciseTimer durationSeconds={90} isRunning={true} onExpire={() => {}} resetKey="test" />);
    expect(screen.getByText('1:30')).toBeDefined();
  });

  it('counts down over time', () => {
    render(<ExerciseTimer durationSeconds={5} isRunning={true} onExpire={() => {}} resetKey="test" />);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByText('0:04')).toBeDefined();
  });

  it('calls onExpire when reaching 0', () => {
    const onExpire = vi.fn();
    render(<ExerciseTimer durationSeconds={2} isRunning={true} onExpire={onExpire} resetKey="test" />);
    act(() => { vi.advanceTimersByTime(3000); });
    expect(onExpire).toHaveBeenCalled();
  });

  it('does not run when isRunning is false', () => {
    render(<ExerciseTimer durationSeconds={5} isRunning={false} onExpire={() => {}} resetKey="test" />);
    act(() => { vi.advanceTimersByTime(3000); });
    expect(screen.getByText('0:05')).toBeDefined();
  });

  it('resets when resetKey changes', () => {
    const { rerender } = render(<ExerciseTimer durationSeconds={60} isRunning={true} onExpire={() => {}} resetKey="a" />);
    act(() => { vi.advanceTimersByTime(5000); });
    rerender(<ExerciseTimer durationSeconds={60} isRunning={true} onExpire={() => {}} resetKey="b" />);
    expect(screen.getByText('1:00')).toBeDefined();
  });
});
