export type Disposer = () => void;

export interface RouteSession {
  readonly generation: number;
  /** Aborted when this route is torn down; pass it to every listener the route installs. */
  readonly signal: AbortSignal;
  /** True once a newer route has begun. Re-check after every `await`. */
  readonly isStale: boolean;
  /**
   * Registers cleanup for this route. If the session is already stale — the caller finished an
   * async step after the user navigated away — the resource is disposed immediately instead of
   * being registered, so a late Pixi Application can never outlive its route.
   */
  onTeardown(dispose: Disposer): void;
}

/**
 * Routes here are async: a slow render can finish after the user has already navigated on.
 * Teardown alone is not enough, because the stale render installs its resources *after* the
 * teardown ran. A generation token makes that case detectable, and `onTeardown` makes it safe.
 */
export class RouteLifecycle {
  #generation = 0;
  #controller: AbortController | undefined;
  #disposers: Disposer[] = [];

  get generation(): number { return this.#generation; }

  /** Tears down the previous route and opens a new session. */
  begin(): RouteSession {
    this.end();
    const generation = this.#generation;
    const controller = new AbortController();
    this.#controller = controller;
    const lifecycle = this;
    return {
      generation,
      signal: controller.signal,
      get isStale() { return lifecycle.#generation !== generation; },
      onTeardown(dispose: Disposer) {
        if (lifecycle.#generation !== generation) { runSafely(dispose); return; }
        lifecycle.#disposers.push(dispose);
      },
    };
  }

  /** Disposes the current route's resources. Safe to call repeatedly. */
  end(): void {
    this.#generation += 1;
    this.#controller?.abort();
    this.#controller = undefined;
    const disposers = this.#disposers;
    this.#disposers = [];
    for (const dispose of disposers.reverse()) runSafely(dispose);
  }
}

function runSafely(dispose: Disposer): void {
  try {
    dispose();
  } catch (error) {
    console.error('Route teardown failed', error);
  }
}
