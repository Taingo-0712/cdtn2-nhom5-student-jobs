const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { findUserByEmail } = require('../repositories/userRepository');

async function login(email, password) {
  const user = await findUserByEmail(email);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return null;
  }

  if (user.role !== 'STUDENT' && user.role !== 'EMPLOYER') {
    return null;
  }

  const userId = String(user.user_id);
  const expiresIn = 3600;
  const accessToken = jwt.sign(
    { role: user.role },
    process.env.JWT_SECRET,
    { subject: userId, expiresIn, algorithm: 'HS256' }
  );

  return {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: expiresIn,
    user: {
      user_id: userId,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
    },
  };
}

module.exports = { login };
