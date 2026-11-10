const { ApiError } = require('./errorHandler');

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.auth) {
      return next(new ApiError(401, 'AUTH_REQUIRED', 'Cần đăng nhập.'));
    }

    if (!allowedRoles.includes(req.auth.role)) {
      return next(new ApiError(403, 'ROLE_FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.'));
    }

    return next();
  };
}

module.exports = requireRole;
