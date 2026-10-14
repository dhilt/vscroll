export class ClipModel {
  doClip: boolean;
  callCount: number;
  forceForward: boolean;
  forceBackward: boolean;

  /** Exception that can occur within onBeforeClip */
  exception?: unknown;

  /** Checks field presence, distinguishing throw undefined from no exception. */
  get hasException(): boolean {
    return 'exception' in this;
  }

  get force(): boolean {
    return this.forceForward || this.forceBackward;
  }

  constructor() {
    this.callCount = 0;
    this.reset();
  }

  reset(force?: boolean): void {
    this.doClip = false;
    delete this.exception;
    if (!force) {
      this.forceForward = false;
      this.forceBackward = false;
    }
  }

  dispose(): void {
    // Consume before cleanup callbacks can reenter the workflow.
    const { hasException, exception } = this;
    delete this.exception;
    if (hasException) {
      // Defer the throw so the complete Workflow disposal can finish.
      setTimeout(() => {
        throw exception;
      });
    }
  }
}
