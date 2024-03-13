export default class LoginError extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'LoginError';
    // setPrototypeOf explanation:
    // https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
    Object.setPrototypeOf(this, NeedsLogin.prototype);
  }
}

export class NeedsLogin extends LoginError {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'NeedsLogin';
    // setPrototypeOf explanation:
    // https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
    Object.setPrototypeOf(this, NeedsLogin.prototype);
  }
}

export class CannotLogin extends LoginError {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'CannotLogin';
    // setPrototypeOf explanation:
    // https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
    Object.setPrototypeOf(this, NeedsLogin.prototype);
  }
}
