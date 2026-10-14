/**
 * Runs a stepper in small time slices so heavy work (solver, generator) never blocks
 * the UI thread for more than ~`sliceMs` at a time.
 */
export interface SlicedTask<T> {
  promise: Promise<T>;
  cancel: () => void;
}

export class CancelledError extends Error {
  constructor() {
    super('cancelled');
  }
}

const now = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/**
 * `step(budget)` must return a value when finished or `null` to continue.
 * Budget is in abstract work units (solver expansions).
 */
export function runSliced<T>(step: (budget: number) => T | null, sliceMs = 6, unitsPerCall = 128): SlicedTask<T> {
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let rejectFn: ((e: Error) => void) | null = null;
  const promise = new Promise<T>((resolve, reject) => {
    rejectFn = reject;
    const tick = (): void => {
      if (cancelled) return;
      const start = now();
      try {
        do {
          const out = step(unitsPerCall);
          if (out !== null) {
            resolve(out);
            return;
          }
        } while (now() - start < sliceMs);
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)));
        return;
      }
      timer = setTimeout(tick, 0);
    };
    timer = setTimeout(tick, 0);
  });
  return {
    promise,
    cancel: () => {
      if (cancelled) return;
      cancelled = true;
      if (timer) clearTimeout(timer);
      rejectFn?.(new CancelledError());
    },
  };
}
