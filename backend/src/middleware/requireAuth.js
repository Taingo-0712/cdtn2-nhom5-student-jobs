const jwt = require('jsonwebtoken');
const { ApiError } = require('./errorHandler');
const { findUserRoleById } = require('../repositories/userRepository');

async function requireAuth(req, res, next) {
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

  let claims;
  try {
    claims = jwt.verify(match[1], secret, { algorithms: ['HS256'] });
  } catch {
    return next(invalidToken());
  }

  if (
    !claims ||
    typeof claims.sub !== 'string' ||
    !/^[1-9]\d{0,18}$/.test(claims.sub) ||
    BigInt(claims.sub) > 9223372036854775807n ||
    !Number.isInteger(claims.exp) ||
    !['STUDENT', 'EMPLOYER'].includes(claims.role)
  ) {
    return next(invalidToken());
  }

  const currentRole = await findUserRoleById(claims.sub);
  if (currentRole !== claims.role) {
    return next(invalidToken());
  }

  req.auth = claims;
  return next();
}

module.exports = requireAuth;
