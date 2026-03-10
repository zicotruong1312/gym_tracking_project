import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [headerDate, setHeaderDate] = useState('');

  useEffect(() => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    setHeaderDate(new Date().toLocaleDateString('vi-VN', options));
  }, []);

  const pageTitle = location.pathname === '/stats' ? 'Thống kê' : 'Today';

  const logout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  return (
    <div className="app-wrapper">
      <aside className="app-sidebar">
        <div className="sidebar-logo">
          <i className="bi bi-heart-pulse-fill" />
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/today" className={({ isActive }) => (isActive ? 'active-link' : '')} title="Today">
            <i className="bi bi-house-door" />
          </NavLink>
          <NavLink to="/workout" className={({ isActive }) => (isActive ? 'active-link' : '')} title="Bài tập">
            <i className="bi bi-lightning" />
          </NavLink>
          <NavLink to="/coach" className={({ isActive }) => (isActive ? 'active-link' : '')} title="Coach">
            <i className="bi bi-grid-3x3-gap" />
          </NavLink>
          <NavLink to="/stats" className={({ isActive }) => (isActive ? 'active-link' : '')} title="Thống kê">
            <i className="bi bi-bar-chart-line" />
          </NavLink>
        </nav>
      </aside>

      <main className="app-main">
        <header className="top-bar">
          <div className="top-bar-left">
            <div className="device-icon"><i className="bi bi-phone" /></div>
          </div>
          <div className="top-bar-center">
            <div className="brand">HealthFlow</div>
            <div className="view-label">{pageTitle}</div>
            <div className="header-date">{headerDate}</div>
          </div>
          <div className="top-bar-right">
            <button type="button" className="icon-btn" title="Thông báo"><i className="bi bi-bell" /></button>
            <button type="button" className="icon-btn" title="Đăng xuất" onClick={logout}><i className="bi bi-box-arrow-right" /></button>
          </div>
        </header>

        <div className={`content-area ${['/today', '/workout', '/coach', '/stats'].includes(location.pathname) ? 'content-area--wide' : ''}`}>
          {children}
        </div>

        <button type="button" className="fab" title="Thêm dữ liệu">
          <i className="bi bi-plus-lg" />
        </button>
      </main>
    </div>
  );
}

export default Layout;
