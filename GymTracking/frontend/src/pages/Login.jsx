import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import authService from '../services/authService';

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await authService.login({ email, password });
      localStorage.setItem('token', res.data.token);
      navigate('/today');
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng nhập thất bại');
    }
  };

  const handleDemo = () => {
    localStorage.setItem('token', 'demo-token');
    navigate('/today');
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h2>Đăng nhập</h2>
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
          <button type="submit" className="btn btn-primary w-100">Đăng nhập</button>
        </form>
        <div className="mt-3 text-center">
          <Link to="/register" className="btn btn-outline-secondary btn-sm">Đăng ký</Link>
        </div>
        <div className="mt-3">
          <button type="button" className="btn btn-outline-secondary btn-sm w-100" onClick={handleDemo}>
            Vào xem (không cần backend)
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;
