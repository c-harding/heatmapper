/**
 * An error that triggers a tooltip,
 * when thrown in the callback of a supported event listener (e.g. UIButton).
 */

export class TooltipError extends Error {
  readonly timeout?: number;
  readonly dismissalPromise?: Promise<void>;

  constructor(
    message?: string,
    { timeout, dismissalPromise, ...options }: TooltipErrorOptions = {},
  ) {
    super(message, options);
    this.timeout = timeout;
    this.dismissalPromise = dismissalPromise;
    this.name = 'TooltipError';
  }
}

export interface TooltipErrorOptions extends ErrorOptions {
  timeout?: number;
  dismissalPromise?: Promise<void>;
}
