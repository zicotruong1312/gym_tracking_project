import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useUser } from '../context/UserContext';

function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, fetchUser } = useUser();
  const [headerDate, setHeaderDate] = useState('');

  useEffect(() => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    setHeaderDate(new Date().toLocaleDateString('vi-VN', options));
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const protectedPaths = ['/today', '/workout', '/coach', '/stats', '/profile', '/nutrition', '/sleep', '/history', '/settings', '/water'];
    if (protectedPaths.includes(location.pathname)) fetchUser();
  }, [location.pathname, fetchUser]);

  const pageTitles = {
    '/stats': 'Thống kê',
    '/workout': 'Bài tập',
    '/coach': 'Coach',
    '/profile': 'Hồ sơ',
    '/nutrition': 'Dinh dưỡng',
    '/sleep': 'Giấc ngủ',
    '/history': 'Lịch sử',
    '/settings': 'Cài đặt',
    '/water': 'Nước',
  };
  const pageTitle = pageTitles[location.pathname] ?? 'Today';

  const [fabOpen, setFabOpen] = useState(false);
  const fabWrapRef = useRef(null);

  useEffect(() => {
    if (!fabOpen) return;
    const onDocClick = (e) => {
      if (fabWrapRef.current && !fabWrapRef.current.contains(e.target)) setFabOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [fabOpen]);

  const logout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  const fabActions = [
    { to: '/today', label: 'Xem hôm nay', icon: 'bi-house-door' },
    { to: '/water', label: 'Thêm nước', icon: 'bi-droplet-half' },
    { to: '/nutrition', label: 'Thêm bữa ăn', icon: 'bi-egg-fried' },
    { to: '/sleep', label: 'Log giấc ngủ', icon: 'bi-moon-stars' },
    { to: '/workout', label: 'Đánh dấu đã tập', icon: 'bi-lightning' },
  ];

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
          <NavLink to="/nutrition" className={({ isActive }) => (isActive ? 'active-link' : '')} title="Dinh dưỡng">
            <i className="bi bi-egg-fried" />
          </NavLink>
          <NavLink to="/water" className={({ isActive }) => (isActive ? 'active-link' : '')} title="Nước">
            <i className="bi bi-droplet-half" />
          </NavLink>
          <NavLink to="/sleep" className={({ isActive }) => (isActive ? 'active-link' : '')} title="Giấc ngủ">
            <i className="bi bi-moon-stars" />
          </NavLink>
          <NavLink to="/history" className={({ isActive }) => (isActive ? 'active-link' : '')} title="Lịch sử">
            <i className="bi bi-clock-history" />
          </NavLink>
        </nav>
      </aside>

      <main className="app-main">
        <header className="top-bar">
          <div className="top-bar-center">
            <div className="brand">HealthFlow</div>
            <div className="view-label">{pageTitle}</div>
            <div className="header-date">{headerDate}</div>
          </div>
          <div className="top-bar-right">
            {user?.name && <span className="top-bar-user-name">{user.name}</span>}
            <Link to="/profile" className="icon-btn icon-btn--user" title="Hồ sơ – Chỉnh sửa chỉ số cá nhân">
              <i className="bi bi-person-circle" />
            </Link>
            <Link to="/settings" className="icon-btn" title="Cài đặt">
              <i className="bi bi-gear" />
            </Link>
            <button type="button" className="icon-btn" title="Đăng xuất" onClick={logout}>
              <i className="bi bi-box-arrow-right" />
            </button>
          </div>
        </header>

        <div className={`content-area ${['/today', '/workout', '/coach', '/stats', '/profile', '/nutrition', '/sleep', '/history', '/water'].includes(location.pathname) ? 'content-area--wide' : ''}`}>
          {children}
        </div>

        <div className="fab-wrap" ref={fabWrapRef}>
          {fabOpen && (
            <div className="fab-menu">
              {fabActions.map((action) => (
                <Link
                  key={action.to}
                  to={action.to}
                  className="fab-menu-item"
                  onClick={() => setFabOpen(false)}
                >
                  <i className={`bi ${action.icon}`} />
                  <span>{action.label}</span>
                </Link>
              ))}
            </div>
          )}
          <button
            type="button"
            className="fab"
            title="Thêm dữ liệu"
            onClick={() => setFabOpen((v) => !v)}
            aria-expanded={fabOpen}
          >
            <i className="bi bi-plus-lg" />
          </button>
        </div>
      </main>
    </div>
  );
}

export default Layout;
