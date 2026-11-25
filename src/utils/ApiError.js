/**
 * Error type used across the API. Every route throws ApiError with an
 * HTTP status and a machine readable code; the central error handler
 * turns it into a consistent JSON response.
 */
export class ApiError extends Error {
  constructor(status, message, code = 'error', details = undefined) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message, details) {
    return new ApiError(400, message, 'bad_request', details);
  }

  static unauthorized(message = 'Authentication required.') {
    return new ApiError(401, message, 'unauthorized');
  }

  static forbidden(message = 'You do not have permission to do that.') {
    return new ApiError(403, message, 'forbidden');
  }

  static notFound(message = 'Resource not found.') {
    return new ApiError(404, message, 'not_found');
  }

  static conflict(message, details) {
    return new ApiError(409, message, 'conflict', details);
  }

  static tooManyRequests(message = 'Too many requests, please slow down.') {
    return new ApiError(429, message, 'rate_limited');
  }

  static internal(message = 'Something went wrong on the server.') {
    return new ApiError(500, message, 'internal_error');
  }
}

/** Wraps an async route handler so rejected promises reach the error handler. */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
