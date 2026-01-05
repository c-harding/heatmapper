export default class LoginError extends Error {
  name = 'LoginError';

  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
  }
}

export class InvalidLogin extends LoginError {
  readonly status = 403;
  name = 'InvalidLogin';

  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
  }
}

export class NeedsLogin extends LoginError {
  readonly status = 401;
  name = 'NeedsLogin';

  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
  }
}

export class CannotLogin extends LoginError {
  readonly status = 401;
  name = 'CannotLogin';

  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
  }
}
