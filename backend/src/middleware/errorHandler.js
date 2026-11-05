const { randomUUID } = require('node:crypto');

class ApiError extends Error {
  constructor(status, code, message, details = []) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const traceId = randomUUID();
  let apiError = err;

  if (err.type === 'entity.parse.failed') {
    apiError = new ApiError(400, 'VALIDATION_ERROR', 'JSON không hợp lệ.');
  } else if (!(err instanceof ApiError)) {
    console.error(`[${traceId}] ${err.name}`);
    apiError = new ApiError(500, 'INTERNAL_ERROR', 'Đã xảy ra lỗi hệ thống.');
  }

  if (apiError.status === 401) res.set('WWW-Authenticate', 'Bearer');

  res.status(apiError.status).json({
    error: {
      code: apiError.code,
      message: apiError.message,
      details: apiError.details,
    },
    trace_id: traceId,
  });
}

module.exports = { ApiError, errorHandler };
