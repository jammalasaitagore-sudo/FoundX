import { ApiError } from '../utils/ApiError.js';

/**
 * Validates req.body / req.query / req.params against a Zod schema and
 * replaces the raw value with the parsed (typed, trimmed) result.
 */
export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(
        ApiError.badRequest(
          'Some fields are invalid.',
          result.error.issues.map((issue) => ({
            field: issue.path.join('.') || source,
            message: issue.message,
          })),
        ),
      );
    }
    req[source] = result.data;
    next();
  };
}
