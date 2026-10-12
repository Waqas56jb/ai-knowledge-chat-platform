/** Operational error with an HTTP status and a stable code. Messages are safe to show to clients. */
export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.expose = true;
  }
  static badRequest(message = 'The request is invalid.', details) { return new ApiError(400, 'BAD_REQUEST', message, details); }
  static validation(message = 'The request contains invalid fields.', details) { return new ApiError(422, 'VALIDATION_ERROR', message, details); }
  static unauthorized(message = 'Sign in to continue.') { return new ApiError(401, 'UNAUTHORIZED', message); }
  static forbidden(message = 'You do not have permission to do this.') { return new ApiError(403, 'FORBIDDEN', message); }
  static notFound(message = 'The requested resource was not found.') { return new ApiError(404, 'NOT_FOUND', message); }
  static conflict(message = 'This conflicts with the current state.', details) { return new ApiError(409, 'CONFLICT', message, details); }
  static tooMany(message = 'Too many requests. Please wait and try again.') { return new ApiError(429, 'RATE_LIMITED', message); }
  static unavailable(message = 'A dependency is temporarily unavailable. Please try again.') { return new ApiError(503, 'SERVICE_UNAVAILABLE', message); }
}
