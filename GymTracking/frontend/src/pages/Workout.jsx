import { useState, useEffect, useRef } from 'react';
import dailySummaryService from '../services/dailySummaryService';
import toast from 'react-hot-toast';

const SET_DURATION_SEC = 90;   // 1 phút 30 — thời gian 1 set
const REST_BETWEEN_SETS_SEC = 20; // 20 giây nghỉ giữa set, sau đó bấm Bắt đầu cho set tiếp theo

const EXERCISES = [
  {
    id: 'bench-press',
    name: 'Bench Press',
    subtitle: 'Chest • Strength',
    target: 'Pectoralis Major, Anterior Deltoids',
    image: 'https://s3.amazonaws.com/prod.skimble/assets/2289486/image_iphone.jpg',
    sets: 4,
    reps: '8-10',
  },
  {
    id: 'incline-db',
    name: 'Incline Dumbbell Press',
    subtitle: 'Chest • Hypertrophy',
    target: 'Upper Chest, Anterior Deltoids',
    image: 'https://images.unsplash.com/photo-1534368959876-26bf04f2c947?w=400&h=240&fit=crop',
    sets: 3,
    reps: '10-12',
  },
  {
    id: 'squat',
    name: 'Barbell Squat',
    subtitle: 'Legs • Strength',
    target: 'Quads, Glutes, Hamstrings',
    image: 'https://images.unsplash.com/photo-1534368959876-26bf04f2c947?w=400&h=240&fit=crop',
    sets: 4,
    reps: '6-8',
  },
  {
    id: 'deadlift',
    name: 'Romanian Deadlift',
    subtitle: 'Posterior Chain',
    target: 'Hamstrings, Glutes, Lower Back',
    image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&h=240&fit=crop',
    sets: 3,
    reps: '10-12',
  },
];

function Workout() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [timerSec, setTimerSec] = useState(SET_DURATION_SEC);
  const [timerRunning, setTimerRunning] = useState(false);
  // 'idle' | 'setCounting' | 'setPaused' | 'restCounting' | 'restPaused' | 'restDone'
  const [phase, setPhase] = useState('idle');
  const [setsRemaining, setSetsRemaining] = useState(EXERCISES[0].sets);
  const exercisedMarkedRef = useRef(false);
  const exercise = EXERCISES[selectedIndex];

  // Reset state when switching exercise
  useEffect(() => {
    setSetsRemaining(exercise.sets);
    setTimerSec(SET_DURATION_SEC);
    setPhase('idle');
    setTimerRunning(false);
  }, [selectedIndex, exercise.sets]);

  // Khi timer về 0: chuyển set → nghỉ 20s, hoặc nghỉ xong → restDone
  useEffect(() => {
    if (timerSec !== 0 || !timerRunning) return;
    if (phase === 'setCounting') {
      setPhase('restCounting');
      setTimerSec(REST_BETWEEN_SETS_SEC);
    } else if (phase === 'restCounting') {
      setPhase('restDone');
      setTimerRunning(false);
      setTimerSec(SET_DURATION_SEC);
    }
  }, [timerSec, timerRunning, phase]);

  // Countdown: mỗi giây giảm 1, dừng ở 0
  useEffect(() => {
    if (!timerRunning) return;
    const t = setInterval(() => {
      setTimerSec((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [timerRunning]);

  const handleStartSet = () => {
    setTimerSec(SET_DURATION_SEC);
    setTimerRunning(true);
    setPhase('setCounting');
    if (!exercisedMarkedRef.current) {
      exercisedMarkedRef.current = true;
      dailySummaryService.updateToday({ exercisedToday: true })
        .then(() => toast.success('Đã đánh dấu hôm nay đã tập'))
        .catch(() => toast.error('Không cập nhật trạng thái tập'));
    }
  };

  const handleResetForNextSet = () => {
    setSetsRemaining((s) => s - 1);
    setTimerSec(SET_DURATION_SEC);
    setPhase('idle');
    setTimerRunning(false);
  };

  const handlePause = () => {
    setTimerRunning(false);
    setPhase((p) => (p === 'setCounting' ? 'setPaused' : p === 'restCounting' ? 'restPaused' : p));
  };

  const handleResume = () => {
    setTimerRunning(true);
    setPhase((p) => (p === 'setPaused' ? 'setCounting' : p === 'restPaused' ? 'restCounting' : p));
  };

  const handleCompleteExercise = () => {
    setSetsRemaining(0);
    setPhase('idle');
    setTimerRunning(false);
    dailySummaryService.updateToday({ exercisedToday: true })
      .then(() => toast.success('Đã hoàn thành bài tập!'))
      .catch(() => toast.error('Không cập nhật được'));
  };

  const handleCompleteWorkout = () => {
    dailySummaryService.updateToday({ exercisedToday: true })
      .then(() => toast.success('Đã hoàn thành buổi tập!'))
      .catch(() => toast.error('Không cập nhật được'));
  };

  const showCompleteExercise = setsRemaining === 0;
  const showStartNext = phase === 'restDone' && setsRemaining > 0;
  const showStartSet = phase === 'idle' && !showCompleteExercise;
  const showTimerActions = ['setCounting', 'setPaused', 'restCounting', 'restPaused'].includes(phase);
  const isSetPhase = ['idle', 'setCounting', 'setPaused'].includes(phase);
  const isRestPhase = ['restCounting', 'restPaused', 'restDone'].includes(phase);
  const timerLabel = isSetPhase ? 'Thời gian set' : 'Nghỉ giữa set';
  const timerHint = phase === 'setCounting' ? 'Đang tập set…' : phase === 'restCounting' ? 'Nghỉ 20 giây…' : phase === 'setPaused' || phase === 'restPaused' ? 'Đã tạm dừng' : null;

  return (
    <div className="workout-page">
      <div className="workout-grid">
        <div className="workout-sidebar card-dark">
          <h5 className="workout-sidebar-title">Bài tập hôm nay</h5>
          <div className="workout-list">
            {EXERCISES.map((ex, i) => (
              <button
                key={ex.id}
                type="button"
                className={`workout-list-item ${selectedIndex === i ? 'workout-list-item--active btn-fitbit' : 'card-dark-item'}`}
                onClick={() => setSelectedIndex(i)}
              >
                <div>
                  <div className="fw-bold">{ex.name}</div>
                  <small className={selectedIndex === i ? '' : 'text-muted'}>{ex.subtitle}</small>
                </div>
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-fitbit w-100 workout-complete-btn" onClick={handleCompleteWorkout}>
            <i className="bi bi-check2-circle me-2" />
            Hoàn thành buổi tập
          </button>
        </div>
        <div className="workout-main card-dark">
          <h4 className="workout-main-title">{exercise.name}</h4>
          <p className="workout-main-target text-muted">Target: {exercise.target}</p>
          <div className="workout-video-placeholder">
            <img
              src={exercise.image}
              alt={exercise.name}
              className="workout-video-image"
            />
            <i className="bi bi-play-circle-fill workout-video-play-icon" aria-hidden />
          </div>
          <div className="workout-meta">
            <div className="workout-meta-item">
              <small className="text-muted d-block">SETS</small>
              <strong>{setsRemaining} / {exercise.sets}</strong>
            </div>
            <div className="workout-meta-item"><small className="text-muted d-block">REPS</small><strong>{exercise.reps}</strong></div>
          </div>
        </div>
        <div className="workout-timer card-dark">
          <h5 className="workout-timer-title"><i className="bi bi-stopwatch" /> Timer</h5>
          <p className="workout-timer-label text-muted">{timerLabel}</p>
          <p className="workout-timer-value">
            {String(Math.floor(timerSec / 60)).padStart(2, '0')}:{String(timerSec % 60).padStart(2, '0')}
          </p>
          {showStartSet && (
            <button type="button" className="btn btn-fitbit w-100" onClick={handleStartSet}>
              Bắt đầu Set
            </button>
          )}
          {showStartNext && (
            <>
              <p className="workout-timer-hint">Sẵn sàng set tiếp theo. Bấm Bắt đầu để chuyển set.</p>
              <button type="button" className="btn btn-fitbit w-100" onClick={handleResetForNextSet}>
                Bắt đầu
              </button>
            </>
          )}
          {showCompleteExercise && (
            <button type="button" className="btn btn-fitbit w-100" onClick={handleCompleteExercise}>
              Hoàn thành bài tập
            </button>
          )}
          {timerHint && <p className="workout-timer-hint">{timerHint}</p>}
          {showTimerActions && (
            <div className="workout-timer-actions">
              {phase === 'setCounting' || phase === 'restCounting' ? (
                <button type="button" className="btn btn-outline-light btn-sm workout-timer-btn" onClick={handlePause}>
                  <i className="bi bi-pause-fill me-1" /> Tạm dừng
                </button>
              ) : (
                <button type="button" className="btn btn-fitbit btn-sm workout-timer-btn" onClick={handleResume}>
                  <i className="bi bi-play-fill me-1" /> Tiếp tục
                </button>
              )}
              <button type="button" className="btn btn-outline-light btn-sm workout-timer-btn" onClick={handleResetForNextSet}>
                <i className="bi bi-check2 me-1" /> Hoàn thành set
              </button>
              <button type="button" className="btn btn-outline-light btn-sm workout-timer-btn" onClick={handleCompleteExercise}>
                <i className="bi bi-flag-fill me-1" /> Hoàn thành bài tập
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Workout;
