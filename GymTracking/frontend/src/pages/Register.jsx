import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import authService from '../services/authService';

function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await authService.register({ email, password });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng ký thất bại');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h2>Đăng ký</h2>
        <form onSubmit={handleSubmit} className="mt-4">
          <div className="mb-3">
            <input
              type="email"
              className="form-control"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <input
              type="password"
              className="form-control"
              placeholder="Mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <div className="text-danger small mb-2">{error}</div>}
          <button type="submit" className="btn btn-primary w-100">Đăng ký</button>
        </form>
        <div className="mt-3 text-center">
          <Link to="/" className="btn btn-outline-secondary btn-sm">Đã có tài khoản? Đăng nhập</Link>
        </div>
      </div>
    </div>
  );
}

export default Register;
