import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

/** 404 for any unmatched route. */
export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: { code: 'not_found', message: `Route ${req.method} ${req.originalUrl} does not exist.` },
  });
}

/**
 * Central error handler. Produces one response shape for every failure:
 * { success: false, error: { code, message, details? } }
 */
export function errorHandler(err, req, res, _next) {
  let status = 500;
  let code = 'internal_error';
  let message = 'Something went wrong on the server.';
  let details;

  if (err instanceof ApiError) {
    status = err.status;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    status = 422;
    code = 'validation_error';
    message = 'Some fields are invalid.';
    details = err.issues.map((issue) => ({
      field: issue.path.join('.') || 'body',
      message: issue.message,
    }));
  } else if (err?.type === 'entity.parse.failed') {
    status = 400;
    code = 'invalid_json';
    message = 'Request body is not valid JSON.';
  } else if (err?.type === 'entity.too.large') {
    status = 413;
    code = 'payload_too_large';
    message = 'Request body is too large.';
  } else if (err?.code === 'LIMIT_FILE_SIZE') {
    status = 413;
    code = 'file_too_large';
    message = `Image is too large. Maximum size is ${env.maxUploadMb} MB.`;
  } else if (err?.code === 'LIMIT_UNEXPECTED_FILE') {
    status = 400;
    code = 'unexpected_file_field';
    message = 'Unexpected file field. Use the field name "image".';
  } else if (err instanceof Error) {
    message = env.isProduction ? 'Something went wrong on the server.' : err.message;
    if (!env.isProduction) details = { stack: err.stack?.split('\n').slice(0, 5) };
  }

  if (status >= 500) {
    console.error('[FoundX] Unhandled error:', err);
  }

  res.status(status).json({
    success: false,
    error: { code, message, ...(details ? { details } : {}) },
  });
}
