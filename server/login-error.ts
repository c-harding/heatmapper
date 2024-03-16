export default class LoginError extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'LoginError';
  }
}

export class NeedsLogin extends LoginError {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'NeedsLogin';
  }
}

export class CannotLogin extends LoginError {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'CannotLogin';
  }
}
