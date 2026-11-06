const { Router } = require('express');
const { ApiError } = require('../middleware/errorHandler');
const { login } = require('../services/authService');

const router = Router();

router.post('/login', async (req, res) => {
  if (!req.is('application/json')) {
    throw new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Yêu cầu gửi JSON.');
  }

  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Dữ liệu đăng nhập không hợp lệ.');
  }

  if (Object.keys(body).some((key) => key !== 'email' && key !== 'password')) {
    throw new ApiError(400, 'FIELD_NOT_ALLOWED', 'Yêu cầu có trường không được phép.');
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = body.password;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (
    email.length > 254 || !emailPattern.test(email) ||
    typeof password !== 'string' || password.length === 0 || password.length > 128
  ) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Email hoặc mật khẩu không hợp lệ.');
  }

  const data = await login(email, password);
  if (!data) {
    res.set('WWW-Authenticate', 'Bearer');
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng.');
  }

  res.set('Cache-Control', 'no-store');
  res.status(200).json({ data });
});

module.exports = router;
