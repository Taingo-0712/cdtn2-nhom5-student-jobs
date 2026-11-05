const jwt = require('jsonwebtoken');
const { ApiError } = require('./errorHandler');

function requireAuth(req, res, next) {
  const authorization = req.get('Authorization');

  if (!authorization) {
    return next(new ApiError(401, 'AUTH_REQUIRED', 'Cần đăng nhập.'));
  }

  const match = /^Bearer (\S+)$/i.exec(authorization);
  const invalidToken = () =>
    new ApiError(401, 'INVALID_TOKEN', 'Token không hợp lệ hoặc đã hết hạn.');

  if (!match) return next(invalidToken());

  const secret = process.env.JWT_SECRET;
  if (!secret) return next(new Error('JWT_SECRET is missing'));

  try {
    const claims = jwt.verify(match[1], secret, { algorithms: ['HS256'] });

    if (typeof claims.sub !== 'string' || !Number.isInteger(claims.exp)) {
      return next(invalidToken());
    }

    req.auth = claims;
    return next();
  } catch {
    return next(invalidToken());
  }
}

module.exports = requireAuth;
