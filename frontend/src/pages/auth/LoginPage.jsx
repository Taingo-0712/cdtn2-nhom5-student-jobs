import { useState } from 'react';
import { useAuth } from '../../auth/AuthContext.jsx';
import '../../styles/login.css';

export default function LoginPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { session, signIn, signOut } = useAuth();

  async function handleSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await signIn(form.get('email'), form.get('password'));
    } catch (error) {
      setErrorMessage(
        error.code === 'INVALID_CREDENTIALS'
          ? 'Email hoặc mật khẩu không đúng.'
          : 'Không thể đăng nhập. Vui lòng thử lại.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (session) {
    return (
      <>
        <h1>Đăng nhập</h1>
        <p role="status">Đăng nhập thành công. Vai trò {session.user.role}.</p>
        <button type="button" onClick={signOut}>Đăng xuất</button>
      </>
    );
  }

  return (
    <section className="login-page" aria-labelledby="login-title">
      <div className="login-heading">
        <h1 id="login-title">Đăng nhập</h1>
        <p>Sử dụng email và mật khẩu tài khoản. Hệ thống xác định quyền sau khi xác thực.</p>
      </div>

      <div className="login-panel">
        <form className="login-card" onSubmit={handleSubmit}>
          <h2>Thông tin đăng nhập</h2>

          <label className="login-field">
            Email *
            <input name="email" type="email" autoComplete="username" required />
          </label>

          <label className="login-field">
            Mật khẩu *
            <input
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
            />
          </label>

          <button
            className="login-toggle"
            type="button"
            onClick={() => setShowPassword((shown) => !shown)}
          >
            {showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          </button>

          {errorMessage && <p className="login-error" role="alert">{errorMessage}</p>}

          <button className="login-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>
        </form>

        <p className="login-note">Mỗi tài khoản có một vai trò được xác thực.</p>
      </div>
    </section>
  );
}
