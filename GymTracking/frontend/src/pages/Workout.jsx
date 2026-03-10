function Workout() {
  return (
    <div className="workout-page">
      <div className="workout-grid">
        <div className="workout-sidebar card-dark">
          <h5 className="workout-sidebar-title">Today&apos;s Workout</h5>
          <div className="workout-list">
            <button type="button" className="workout-list-item workout-list-item--active btn-fitbit">
              <div>
                <div className="fw-bold">Bench Press</div>
                <small>Chest • Strength</small>
              </div>
            </button>
            <button type="button" className="workout-list-item card-dark-item">
              <div>
                <div className="fw-bold">Incline Dumbbell Press</div>
                <small className="text-muted">Chest • Hypertrophy</small>
              </div>
            </button>
          </div>
        </div>
        <div className="workout-main card-dark">
          <h4 className="workout-main-title">Bench Press</h4>
          <p className="workout-main-target text-muted">Target: Pectoralis Major, Anterior Deltoids</p>
          <div className="workout-video-placeholder">
            <i className="bi bi-play-circle-fill text-secondary" />
          </div>
          <div className="workout-meta">
            <div className="workout-meta-item"><small className="text-muted d-block">SETS</small><strong>4</strong></div>
            <div className="workout-meta-item"><small className="text-muted d-block">REPS</small><strong>8-10</strong></div>
          </div>
        </div>
        <div className="workout-timer card-dark">
          <h5 className="workout-timer-title"><i className="bi bi-stopwatch" /> Timer</h5>
          <p className="workout-timer-label text-muted">Thời gian thực hiện</p>
          <p className="workout-timer-value">01:30</p>
          <button type="button" className="btn btn-fitbit w-100">Bắt đầu Set</button>
        </div>
      </div>
    </div>
  );
}

export default Workout;
