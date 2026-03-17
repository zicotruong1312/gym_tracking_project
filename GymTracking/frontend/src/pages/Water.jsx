import { useEffect, useState } from 'react';
import dailySummaryService from '../services/dailySummaryService';
import toast from 'react-hot-toast';

const WATER_GOAL_ML = 2000;
const QUICK_AMOUNTS = [250, 500, 750];

function Water() {
  const [loading, setLoading] = useState(true);
  const [waterMl, setWaterMl] = useState(0);
  const [adding, setAdding] = useState(false);
  const [customMl, setCustomMl] = useState('');

  useEffect(() => {
    dailySummaryService.getToday()
      .then((res) => setWaterMl(res.data.waterMl ?? 0))
      .catch(() => toast.error('Không tải được dữ liệu nước hôm nay'))
      .finally(() => setLoading(false));
  }, []);

  const addWater = (ml) => {
    const amount = Number(ml);
    if (!amount || amount <= 0) return;
    setAdding(true);
    const newTotal = (waterMl || 0) + amount;
    dailySummaryService.updateToday({ waterMl: newTotal })
      .then((res) => {
        setWaterMl(res.data.waterMl ?? newTotal);
        setCustomMl('');
        toast.success(`Đã thêm ${amount} ml nước`);
      })
      .catch(() => toast.error('Không cập nhật được'))
      .finally(() => setAdding(false));
  };

  const handleSubmitCustom = (e) => {
    e.preventDefault();
    const ml = Number(customMl);
    if (Number.isNaN(ml) || ml <= 0) {
      toast.error('Vui lòng nhập số ml hợp lệ');
      return;
    }
    addWater(ml);
  };

  const remaining = Math.max(WATER_GOAL_ML - (waterMl || 0), 0);
  const progressPct = WATER_GOAL_ML > 0 ? Math.min(100, ((waterMl || 0) / WATER_GOAL_ML) * 100) : 0;

  if (loading) {
    return (
      <div className="water-page">
        <h1 className="page-full-title">Nước</h1>
        <div className="today-sections">
          <section className="today-section">
            <h2 className="today-section-title">Đang tải...</h2>
            <div className="today-cards today-cards--1col">
              <div className="fitbit-card card-dark">
                <div className="skeleton-block" style={{ height: 28, width: '40%', marginBottom: 10 }} />
                <div className="skeleton-block" style={{ height: 40, width: '60%' }} />
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="water-page">
      <h1 className="page-full-title">Nước</h1>
      <div className="today-sections">
        <section className="today-section">
          <h2 className="today-section-title">Tổng quan hôm nay</h2>
          <div className="today-cards today-cards--2col">
            <div className="fitbit-card">
              <div className="fitbit-card-body">
                <p className="fitbit-card-title">Đã uống</p>
                <p className="fitbit-card-value">{(waterMl || 0).toLocaleString()} ml</p>
                <p className="fitbit-card-sub">Mục tiêu: {WATER_GOAL_ML.toLocaleString()} ml</p>
              </div>
              <div className="fitbit-card-icon blue"><i className="bi bi-droplet-half" /></div>
            </div>
            <div className="fitbit-card">
              <div className="fitbit-card-body">
                <p className="fitbit-card-title">Còn lại</p>
                <p className="fitbit-card-value">{remaining.toLocaleString()} ml</p>
                <p className="fitbit-card-sub">Hôm nay</p>
              </div>
              <div className="fitbit-card-icon"><i className="bi bi-droplet" /></div>
            </div>
          </div>
          {WATER_GOAL_ML > 0 && (
            <div className="water-progress-wrap">
              <div className="water-progress-bar" style={{ width: `${progressPct}%` }} />
              <span className="water-progress-label">{Math.round(progressPct)}% mục tiêu</span>
            </div>
          )}
        </section>

        <section className="today-section">
          <h2 className="today-section-title">Thêm nhanh</h2>
          <div className="today-cards today-cards--3col">
            {QUICK_AMOUNTS.map((ml) => (
              <button
                key={ml}
                type="button"
                className="fitbit-card btn-quick-meal"
                disabled={adding}
                onClick={() => addWater(ml)}
              >
                <div className="fitbit-card-body">
                  <p className="fitbit-card-title">+{ml} ml</p>
                  <p className="fitbit-card-value">{ml === 250 ? '1 ly' : ml === 500 ? '2 ly' : '~3 ly'}</p>
                  <p className="fitbit-card-sub">Nhấn để cộng vào hôm nay</p>
                </div>
                <div className="fitbit-card-icon blue"><i className="bi bi-plus-lg" /></div>
              </button>
            ))}
          </div>
        </section>

        <section className="today-section">
          <h2 className="today-section-title">Thêm số ml tùy chỉnh</h2>
          <div className="today-cards today-cards--1col">
            <div className="fitbit-card">
              <form className="profile-form" onSubmit={handleSubmitCustom}>
                <div className="profile-form-grid">
                  <div className="profile-form-col">
                    <div className="mb-3">
                      <label className="form-label">Số ml nước</label>
                      <input
                        type="number"
                        className="form-control"
                        min="1"
                        placeholder="Ví dụ: 300, 500..."
                        value={customMl}
                        onChange={(e) => setCustomMl(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <div className="profile-form-actions">
                  <button type="submit" className="btn btn-fitbit profile-save-btn" disabled={adding}>
                    {adding ? 'Đang thêm...' : 'Thêm vào hôm nay'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Water;
