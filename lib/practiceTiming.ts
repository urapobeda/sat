/** A monotonic stopwatch for one question; loading, navigation and grading pause it. */
export class QuestionStopwatch {
  private elapsedMs = 0;
  private startedAt: number | null = null;
  private submitted = false;

  start(now: number) {
    if (!this.submitted && this.startedAt === null) this.startedAt = now;
  }

  pause(now: number) {
    if (this.startedAt !== null) this.elapsedMs += Math.max(0, now - this.startedAt);
    this.startedAt = null;
  }

  seconds(now: number) {
    return Math.min(86400, Math.floor((this.elapsedMs + (this.startedAt === null ? 0 : Math.max(0, now - this.startedAt))) / 1000));
  }

  submit(now: number) {
    this.pause(now);
    this.submitted = true;
    return this.seconds(now);
  }

  retry(now: number, active: boolean) {
    this.submitted = false;
    if (active) this.start(now);
  }
}

export type PracticeAnswerTiming = { questionId: string; timeSpentSeconds: number };
export type TimingSummary = { attempts: number; totalSeconds: number; avgSeconds: number | null };

/** Call with the server's grading result, never a client-provided correctness flag. */
export function countedAnswerSeconds(isCorrect: boolean, seconds: number | null | undefined) {
  return isCorrect && typeof seconds === "number" && Number.isInteger(seconds) && seconds >= 0 && seconds <= 86400 ? seconds : null;
}

export function getQuestionTimingSummaries(timings: PracticeAnswerTiming[]) {
  const result = new Map<string, TimingSummary>();
  for (const timing of timings) {
    if (countedAnswerSeconds(true, timing.timeSpentSeconds) === null) continue;
    const previous = result.get(timing.questionId) ?? { attempts: 0, totalSeconds: 0, avgSeconds: null };
    const attempts = previous.attempts + 1;
    const totalSeconds = previous.totalSeconds + timing.timeSpentSeconds;
    result.set(timing.questionId, { attempts, totalSeconds, avgSeconds: totalSeconds / attempts });
  }
  return result;
}

/** Weight by correct attempts, so a repeatedly practiced question is not lost. */
export function summarizeQuestionTimings(questions: { id: string }[], timings: Map<string, TimingSummary>): TimingSummary {
  let attempts = 0;
  let totalSeconds = 0;
  for (const id of new Set(questions.map((q) => q.id))) {
    const timing = timings.get(id);
    attempts += timing?.attempts ?? 0;
    totalSeconds += timing?.totalSeconds ?? 0;
  }
  return { attempts, totalSeconds, avgSeconds: attempts ? totalSeconds / attempts : null };
}
