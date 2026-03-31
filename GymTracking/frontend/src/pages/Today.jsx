import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import dailySummaryService from '../services/dailySummaryService';
import workoutService from '../services/workoutService';
import recommendationService from '../services/recommendationService';
import coachService from '../services/coachService';
import { useUser } from '../context/UserContext';
import toast from 'react-hot-toast';
import { calcSmartTargets } from '../utils/smartGoalCalc';
import { sendChatMessage } from '../services/chatService';

const WATER_GOAL_ML = 2000;
const TARGET_CALORIES_DEFAULT = 1796;
const TARGET_BURN_DEFAULT = 500;
const WEEK_DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const PREF_KEY = 'healthflow_settings';
const EXERCISE_REMINDER_KEY = 'healthflow_last_exercise_reminded_start_iso';
const REMIND_BEFORE_MINUTES = 30;

function safeLoadPrefs() {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function parseHHMM(hhmm) {
  if (!hhmm || typeof hhmm !== 'string') return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

function getRegionLabelsFromTargetMuscles(targetMuscles, muscleGroup) {
  const ms = Array.isArray(targetMuscles) ? targetMuscles : [];
  const hasAny = (keys) => keys.some((k) => ms.includes(k));

  // Chuyển danh sách "targetMuscles" (từ Exercise) sang nhãn vị trí cơ thể dễ hiểu.
  const regions = [];
  if (hasAny(['chest'])) regions.push('Ngực');
  if (hasAny(['upper-back', 'lower-back', 'trapezius', 'back-deltoids'])) regions.push('Lưng');
  if (hasAny(['front-deltoids'])) regions.push('Vai');
  if (hasAny(['quadriceps', 'hamstring', 'calves', 'gluteal', 'adductor', 'abductors'])) regions.push('Chân');
  if (hasAny(['biceps', 'triceps', 'forearm'])) regions.push('Tay');
  if (hasAny(['abs', 'obliques'])) regions.push('Bụng');

  if (!regions.length && muscleGroup) return [muscleGroup];
  return regions.length ? Array.from(new Set(regions)) : ['—'];
}

// Reusable SVG Activity Ring Component
function ProgressRing({ radius = 24, stroke = 4, progress = 0, color = '#00B0B9', iconClass, ariaLabel }) {
  const normalizedRadius = radius - stroke * 0.5;
  const circumference = normalizedRadius * 2 * Math.PI;
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;

  return (
    <div
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel || undefined}
      style={{ position: 'relative', width: radius * 2, height: radius * 2 }}
    >
      <svg height={radius * 2} width={radius * 2} style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }} aria-hidden="true">
        <circle stroke="rgba(255,255,255,0.1)" fill="transparent" strokeWidth={stroke} r={normalizedRadius} cx={radius} cy={radius} />
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.8s ease-in-out' }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: color, fontSize: radius > 20 ? '1.2rem' : '1rem' }} aria-hidden="true">
        <i className={iconClass} />
      </div>
    </div>
  );
}

function Today() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [recLoading, setRecLoading] = useState(true);
  const [recommendations, setRecommendations] = useState(null);
  const recommendationsRef = useRef(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiReco, setAiReco] = useState('');
  const [showAiModal, setShowAiModal] = useState(false);
  const aiAskedOnceRef = useRef(false);
  const [popularClasses, setPopularClasses] = useState([]);
  const [popularBusy, setPopularBusy] = useState(true);
  const [weekData, setWeekData] = useState(Array(7).fill(0));
  const [summary, setSummary] = useState({
    waterMl: 0,
    caloriesConsumed: 0,
    caloriesBurned: 0,
    glucoseConsumed: 0,
    sleepMinutes: null,
    exercisedToday: false,
  });

  const [exerciseSchedule, setExerciseSchedule] = useState({
    enabled: false,
    startTime: null,
    endTime: null,
  });

  const [waterBusy, setWaterBusy] = useState(false);

  // Giữ bản recommendations mới nhất để khi toast đến giờ không bị phụ thuộc vào effect
  useEffect(() => {
    recommendationsRef.current = recommendations;
  }, [recommendations]);

  const loadTodayData = useCallback(() => {
    setLoading(true);
    Promise.all([
      dailySummaryService.getToday(),
      dailySummaryService.getHistory(),
      workoutService.getHistory()
    ]).then(([todayRes, historyRes, workoutRes]) => {
      const workouts = workoutRes.data?.data || [];

      // Tính caloriesBurned hôm nay từ Workout records (đáng tin cậy hơn DailySummary cache)
      const todayStr = new Date().toDateString();
      const todayBurned = workouts
        .filter(w => new Date(w.date).toDateString() === todayStr)
        .reduce((sum, w) => {
          const cal = w.caloriesBurned > 0 ? w.caloriesBurned : (w.totalDurationMinutes || 0) * 6;
          return sum + cal;
        }, 0);
      const hasWorkedOutToday = workouts.some(w => new Date(w.date).toDateString() === todayStr);

      setSummary({
        waterMl: todayRes.data.waterMl ?? 0,
        caloriesConsumed: todayRes.data.caloriesConsumed ?? 0,
        caloriesBurned: todayBurned || todayRes.data.caloriesBurned || 0,
        glucoseConsumed: todayRes.data.glucoseConsumed ?? 0,
        sleepMinutes: todayRes.data.sleepMinutes,
        exercisedToday: hasWorkedOutToday || todayRes.data.exercisedToday || false,
      });

      // Xây dựng mảng Activity cho 7 ngày của tuần (Sun -> Sat) từ Workout records
      const dataArr = Array(7).fill(0);
      workouts.forEach(w => {
        const d = new Date(w.date);
        const today = new Date();
        const diffDays = Math.floor((today - d) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 7) {
          const cal = w.caloriesBurned > 0 ? w.caloriesBurned : (w.totalDurationMinutes || 0) * 6;
          dataArr[d.getDay()] = Math.max(dataArr[d.getDay()], cal);
        }
      });
      // Fallback: bổ sung từ DailySummary history nếu workout records không có
      const historyItems = historyRes.data?.data || [];
      const today = new Date();
      historyItems.forEach(day => {
        const d = new Date(day.date);
        const diffDays = Math.floor((today - d) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 7 && day.caloriesBurned > 0) {
          dataArr[d.getDay()] = Math.max(dataArr[d.getDay()], day.caloriesBurned);
        }
      });
      setWeekData(dataArr);

    }).catch(() => {
      toast.error('Không tải được dữ liệu hôm nay');
      setSummary((s) => ({ ...s, waterMl: 0, caloriesConsumed: 0 }));
    }).finally(() => setLoading(false));
  }, []);

  const loadRecommendations = useCallback(() => {
    setRecLoading(true);
    recommendationService
      .getTodayRecommendations()
      .then((res) => setRecommendations(res.data?.data || null))
      .catch(() => setRecommendations(null))
      .finally(() => setRecLoading(false));
  }, []);

  useEffect(() => {
    loadTodayData();
  }, [loadTodayData]);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  // Gợi ý workout theo dữ liệu "nhiều người xem/thích"
  useEffect(() => {
    let mounted = true;
    setPopularBusy(true);
    coachService
      .getClasses()
      .then((res) => {
        if (!mounted) return;
        const list = res.data?.data || [];
        const sorted = [...list].sort((a, b) => {
          const likesA = a?.likesCount ?? 0;
          const likesB = b?.likesCount ?? 0;
          const viewsA = a?.viewsCount ?? 0;
          const viewsB = b?.viewsCount ?? 0;
          return likesB - likesA || viewsB - viewsA;
        });
        setPopularClasses(sorted.slice(0, 3));
      })
      .catch(() => {})
      .finally(() => {
        if (!mounted) return;
        setPopularBusy(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // AI gợi ý nhanh cho UI (món + bài tập)
  useEffect(() => {
    if (!recommendations) return;
    if (aiAskedOnceRef.current) return;
    aiAskedOnceRef.current = true;

    const meta = recommendations?.meta || {};
    const remaining = meta.caloriesRemaining ?? remainingCalories;
    const proteinToday = meta.proteinToday ?? null;
    const neglectedMuscleGroup = meta.neglectedMuscleGroup ?? null;

    const prompt =
      `Dựa trên dữ liệu hôm nay trong app: caloriesRemaining=${remaining}, proteinToday=${proteinToday ?? '—'}, neglectedMuscleGroup=${neglectedMuscleGroup ?? '—'}. ` +
      `Hãy đề xuất ngắn gọn để mình làm ngay.\n` +
      `Yêu cầu:\n` +
      `- 1 món ăn Việt Nam phù hợp (ghi: tên, khoảng kcal, lưu ý protein/đường nếu có).\n` +
      `- 1 bài tập cho nhóm cơ đang bị bỏ quên (ghi: tên bài, sets/reps gợi ý, vì sao phù hợp).\n` +
      `Trả lời dạng:\n` +
      `Món ăn: ...\n` +
      `Bài tập: ...`;

    const run = async () => {
      setAiBusy(true);
      try {
        const res = await sendChatMessage(prompt, []);
        const reply = res.data?.data?.reply || '';
        setAiReco(reply);
      } catch {
        setAiReco('');
      } finally {
        setAiBusy(false);
      }
    };

    run();
  }, [recommendations]);

  // Load cấu hình lịch tập (exercise schedule) từ Settings
  useEffect(() => {
    const prefs = safeLoadPrefs();
    const notificationsEnabled = prefs.notifications ?? true;
    const enabled = Boolean(prefs.exerciseScheduleEnabled) && notificationsEnabled;
    setExerciseSchedule({
      enabled,
      startTime: typeof prefs.exerciseStartTime === 'string' ? prefs.exerciseStartTime : null,
      endTime: typeof prefs.exerciseEndTime === 'string' ? prefs.exerciseEndTime : null,
    });
  }, []);

  // Nhắc "30 phút trước giờ bắt đầu" đúng 1 lần cho mỗi lần bắt đầu (startDate)
  useEffect(() => {
    if (!exerciseSchedule.enabled) return;
    const startMinutes = parseHHMM(exerciseSchedule.startTime);
    if (startMinutes == null) return;

    const now = new Date();
    const startHh = Math.floor(startMinutes / 60);
    const startMm = startMinutes % 60;

    const startDateToday = new Date(now);
    startDateToday.setHours(startHh, startMm, 0, 0);

    const nextStartDate = now >= startDateToday
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, startHh, startMm, 0, 0)
      : startDateToday;

    const reminderDate = new Date(nextStartDate.getTime() - REMIND_BEFORE_MINUTES * 60 * 1000);
    const startIso = nextStartDate.toISOString();
    const lastReminded = localStorage.getItem(EXERCISE_REMINDER_KEY);

    const doNotify = () => {
      try {
        localStorage.setItem(EXERCISE_REMINDER_KEY, startIso);
      } catch {}

      const recs = recommendationsRef.current;
      const topExercises = (recs?.exercises || []).slice(0, 3).map((e) => e?.name).filter(Boolean);
      const windowText = exerciseSchedule.endTime ? `${exerciseSchedule.startTime} - ${exerciseSchedule.endTime}` : exerciseSchedule.startTime;
      const suffix = topExercises.length ? ` Gợi ý: ${topExercises.join(', ')}` : '';
      toast.success(`Nhắc lịch tập: ${windowText}.${suffix}`);
    };

    // Đã nhắc lần này rồi
    if (lastReminded === startIso) return;

    const delayMs = reminderDate.getTime() - now.getTime();
    // Nếu người dùng mở trang sau thời điểm nhắc (nhưng trước giờ bắt đầu) => nhắc ngay
    if (delayMs <= 0 && now < nextStartDate) {
      doNotify();
      return;
    }

    const timeoutId = window.setTimeout(doNotify, Math.max(0, delayMs));
    return () => window.clearTimeout(timeoutId);
  }, [exerciseSchedule.enabled, exerciseSchedule.startTime, exerciseSchedule.endTime]);

  useEffect(() => {
    const onRefresh = () => {
      loadTodayData();
      loadRecommendations();
    };
    window.addEventListener('healthflow:refresh', onRefresh);
    return () => window.removeEventListener('healthflow:refresh', onRefresh);
  }, [loadTodayData, loadRecommendations]);

  const smartTargets = calcSmartTargets(user);
  const baseTargetCalories = smartTargets?.targetIntake ?? (user?.autoStats?.tdee ?? TARGET_CALORIES_DEFAULT);
  const baseTargetBurn = smartTargets?.targetBurn ?? TARGET_BURN_DEFAULT;
  const consumed = summary.caloriesConsumed || 0;
  const remainingCalories = baseTargetCalories - consumed;

  // Xử lý phạt (Penalty): Nếu lố ăn uống, cộng dồn phần dư vào chỉ tiêu đốt cháy
  const excessCals = remainingCalories < 0 ? Math.abs(remainingCalories) : 0;
  const targetBurn = baseTargetBurn + excessCals;

  // Tính toán tiến trình vòng lặp (Progress Pct)
  const foodPct = Math.round((consumed / baseTargetCalories) * 100);
  const waterPct = Math.round(((summary.waterMl || 0) / WATER_GOAL_ML) * 100);
  const burnPct = Math.round(((summary.caloriesBurned || 0) / targetBurn) * 100);

  // Chuẩn lâm sàng nạp đường theo Hiệp hội Tim mạch Hoa Kỳ (AHA) / WHO
  // Theo WHO: Lượng đường tự do (free sugars) nên dưới 10% tổng lượng calo/ngày, và tối ưu là dưới 5% 
  // Ở đây tính mức tối ưu 5% lượng calo mục tiêu (baseTargetCalories) đã cá nhân hóa theo giới tính, độ tuổi, chiều cao...
  const targetGlucose = Math.round((baseTargetCalories * 0.05) / 4) || (user?.gender === 'male' ? 36 : 25);

  const consumedGlucose = summary.glucoseConsumed || 0;
  const glucosePct = Math.round((consumedGlucose / targetGlucose) * 100);

  // Nhắc nhở hôm nay: ưu tiên đúng 3 mục chính theo yêu cầu của bạn
  const waterRemainingMl = Math.max(WATER_GOAL_ML - (summary.waterMl || 0), 0);
  const caloriesMissing = remainingCalories > 0 ? remainingCalories : 0;
  const exerciseMissing = !summary.exercisedToday;

  const scheduledExercises = (recommendations?.exercises || []).slice(0, 2).map((e) => e?.name).filter(Boolean);
  const scheduleWindowText = exerciseSchedule.endTime
    ? `${exerciseSchedule.startTime} - ${exerciseSchedule.endTime}`
    : exerciseSchedule.startTime;
  const hasNutritionReminders = waterRemainingMl > 0 || exerciseMissing || caloriesMissing > 0;

  const addWater = () => {
    if (waterBusy) return;
    const newVal = (summary.waterMl || 0) + 250;
    setWaterBusy(true);
    dailySummaryService.updateToday({ waterMl: newVal })
      .then((res) => {
        setSummary((s) => ({ ...s, waterMl: res.data.waterMl }));
        toast.success('Đã thêm 250 ml nước');
      })
      .catch(() => toast.error('Không cập nhật được'))
      .finally(() => setWaterBusy(false));
  };

  const todayDayIndex = new Date().getDay();

  if (loading) {
    return (
      <div className="today-sections">
        <section className="today-section">
          <h2 className="today-section-title">Đang tải...</h2>
          <div className="today-cards today-cards--2col">
            <div className="fitbit-card">
              <div className="fitbit-card-body">
                <div className="skeleton-block" style={{ height: 18, width: '40%', marginBottom: 10 }} />
                <div className="skeleton-block" style={{ height: 34, width: '55%', marginBottom: 8 }} />
                <div className="skeleton-block" style={{ height: 14, width: '70%' }} />
              </div>
              <div className="skeleton-block" style={{ width: 44, height: 44, borderRadius: '50%' }} />
            </div>
            <div className="fitbit-card">
              <div className="fitbit-card-body">
                <div className="skeleton-block" style={{ height: 18, width: '25%', marginBottom: 10 }} />
                <div className="skeleton-block" style={{ height: 34, width: '45%', marginBottom: 8 }} />
                <div className="skeleton-block" style={{ height: 14, width: '60%' }} />
              </div>
              <div className="skeleton-block" style={{ width: 44, height: 44, borderRadius: '50%' }} />
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="today-sections">

      <section className="today-section">
        <h2 className="today-section-title">Gợi ý hôm nay (Recommendation)</h2>
        <p className="fitbit-card-sub" style={{ marginTop: 0, marginBottom: '12px', maxWidth: '720px' }}>
          Gợi ý món ăn và bài tập dựa trên calo còn lại, protein đã nạp và nhóm cơ ít tập trong 7 ngày — cập nhật qua Socket.IO khi bạn ghi nhận dinh dưỡng / tập.
        </p>
        {recLoading && <p className="text-muted">Đang tải gợi ý…</p>}

        {!recLoading && (
          <div style={{ marginBottom: '16px' }}>
            {aiReco ? (
              <div 
                className="ai-reco-trigger" 
                onClick={() => setShowAiModal(true)}
                style={{
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(14, 165, 233, 0.15) 100%)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  borderRadius: '16px',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(139, 92, 246, 0.1)',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(139, 92, 246, 0.2)';
                  e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.6)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(139, 92, 246, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ 
                    width: '44px', height: '44px', borderRadius: '12px', 
                    background: 'linear-gradient(135deg, #8b5cf6, #0ea5e9)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
                  }}>
                    <i className="bi bi-stars" style={{ fontSize: '1.4rem' }}></i>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <h4 style={{ margin: 0, color: '#fff', fontSize: '1rem', fontWeight: 600 }}>Cố vấn sức khoẻ AI</h4>
                      {aiBusy && <span className="text-muted" style={{ fontSize: '0.75rem' }}>Đang phân tích…</span>}
                    </div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>HealthFlow đã phân tích xong dữ liệu cá nhân của bạn</p>
                  </div>
                </div>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <i className="bi bi-chevron-right" style={{ fontSize: '1rem' }}></i>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {!popularBusy && popularClasses.length > 0 && (
          <div style={{ marginTop: '10px' }} className="fitbit-card card-dark">
            <div className="fitbit-card-body" style={{ width: '100%' }}>
              <p className="fitbit-card-title" style={{ marginBottom: 6 }}>
                Nhiều người chọn (Coach)
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {popularClasses.map((c) => (
                  <div key={c._id} style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', color: '#fff' }}>
                    <div style={{ minWidth: 0 }}>
                      <strong style={{ display: 'block', fontSize: '0.95rem' }}>{c.title}</strong>
                      <span style={{ color: 'var(--fitbit-muted)', fontSize: '0.8rem' }}>
                        {c.duration} · {c.type}
                      </span>
                    </div>
                    <span style={{ color: 'var(--fitbit-teal)', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                      {c.likesCount ?? 0} likes · {c.viewsCount ?? 0} views
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10 }}>
                <Link to="/coach" className="healthflow-rec-link">
                  Xem thêm bài tập →
                </Link>
              </div>
            </div>
          </div>
        )}

        {!recLoading && recommendations && (
          <div className="today-cards today-cards--2col">
            <div className="fitbit-card">
              <div className="fitbit-card-body">
                <p className="fitbit-card-title">Món gợi ý</p>
                <ul className="healthflow-rec-list">
                  {(recommendations.foods || []).map((f) => (
                    <li key={f._id}>
                      <strong>{f.name}</strong>
                      <span className="healthflow-rec-meta">
                        {' '}
                        ~{f.calories} kcal · P {f.protein}g
                      </span>
                      <div className="healthflow-rec-reason">{f.reason}</div>
                    </li>
                  ))}
                </ul>
                <Link to="/nutrition" className="healthflow-rec-link">
                  Mở Dinh dưỡng để thêm món →
                </Link>
              </div>
            </div>
            <div className="fitbit-card">
              <div className="fitbit-card-body">
                <p className="fitbit-card-title">Bài tập gợi ý</p>
                <ul className="healthflow-rec-list">
                  {(recommendations.exercises || []).map((e) => (
                    <li key={e._id}>
                      <strong>{e.name}</strong>
                      <span className="healthflow-rec-meta"> · {e.muscleGroup}</span>
                      <div className="healthflow-rec-reason" style={{ marginTop: 6 }}>
                        Vị trí: {getRegionLabelsFromTargetMuscles(e.targetMuscles, e.muscleGroup).join(', ')}
                        {e.defaultSets ? ` · ${e.defaultSets} sets` : ''}
                        {e.defaultRepsMin && e.defaultRepsMax ? ` · ${e.defaultRepsMin}-${e.defaultRepsMax} reps` : ''}
                      </div>
                      <div className="healthflow-rec-reason">{e.reason}</div>
                    </li>
                  ))}
                </ul>
                <Link to="/workout" className="healthflow-rec-link">
                  Mở Bài tập →
                </Link>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="today-section">
        <h2 className="today-section-title">Nhắc nhở hôm nay</h2>
        <div className="today-cards today-cards--1col">
          {exerciseSchedule.enabled && (
            <div className="fitbit-card">
              <div className="fitbit-card-body">
                <p className="fitbit-card-title">Lịch tập hôm nay</p>
                <p className="fitbit-card-value">{scheduleWindowText || '—'}</p>
                <p className="fitbit-card-sub">
                  Nhắc trước {REMIND_BEFORE_MINUTES} phút
                  {scheduledExercises.length ? ` · Gợi ý: ${scheduledExercises.join(', ')}` : ''}
                </p>
              </div>
              <div className="fitbit-card-icon">
                <i className="bi bi-clock" />
              </div>
            </div>
          )}

          {hasNutritionReminders ? (
            <>
              {waterRemainingMl > 0 && (
                <div className="fitbit-card">
                  <div className="fitbit-card-body">
                    <p className="fitbit-card-title">Nước</p>
                    <p className="fitbit-card-value">{waterRemainingMl} ml</p>
                    <p className="fitbit-card-sub">Còn thiếu để đạt {WATER_GOAL_ML} ml</p>
                  </div>
                  <div className="fitbit-card-icon blue">
                    <i className="bi bi-droplet-half" />
                  </div>
                </div>
              )}

              {exerciseMissing && (
                <div className="fitbit-card">
                  <div className="fitbit-card-body">
                    <p className="fitbit-card-title">Bài tập</p>
                    <p className="fitbit-card-value">Chưa có</p>
                    <p className="fitbit-card-sub">Bạn nên ghi nhận ít nhất 1 buổi tập hôm nay</p>
                  </div>
                  <div className="fitbit-card-icon">
                    <i className="bi bi-lightning" />
                  </div>
                </div>
              )}

              {caloriesMissing > 0 && (
                <div className="fitbit-card">
                  <div className="fitbit-card-body">
                    <p className="fitbit-card-title">Calo trong ngày</p>
                    <p className="fitbit-card-value">{caloriesMissing} kcal</p>
                    <p className="fitbit-card-sub">Còn thiếu để đạt mục tiêu nạp hôm nay</p>
                  </div>
                  <div className="fitbit-card-icon purple">
                    <i className="bi bi-fire" />
                  </div>
                </div>
              )}
            </>
          ) : (
            !exerciseSchedule.enabled && (
              <div className="fitbit-card">
                <div className="fitbit-card-body">
                  <p className="fitbit-card-title">Tuyệt vời!</p>
                  <p className="fitbit-card-sub">Bạn đã đạt các mục tiêu chính (nước, tập, calo) hôm nay.</p>
                </div>
                <div className="fitbit-card-icon">
                  <i className="bi bi-check2" />
                </div>
              </div>
            )
          )}
        </div>
      </section>

      <section className="today-section">
        <h2 className="today-section-title">Nutrition</h2>
        <div className="today-cards today-cards--2col">
          <div className="fitbit-card">
            <div className="fitbit-card-body">
              <p className="fitbit-card-title">Food</p>
              <p className="fitbit-card-value">{consumed} / {baseTargetCalories} kcal</p>
              <p className="fitbit-card-sub" style={{ color: remainingCalories >= 0 ? 'var(--fitbit-muted)' : '#ef4444' }}>
                {remainingCalories >= 0 ? `Còn hạn mức ${remainingCalories} kcal` : `Đã lố ${excessCals} kcal! Phải tập bù`}
              </p>
            </div>
            <ProgressRing
              ariaLabel={`Tiến độ calo: ${consumed} / ${baseTargetCalories} kcal`}
              progress={foodPct}
              color={remainingCalories >= 0 ? "#eab308" : "#ef4444"}
              iconClass="bi bi-apple"
            />
          </div>
          <div className="fitbit-card">
            <div className="fitbit-card-body">
              <p className="fitbit-card-title">Water</p>
              <p className="fitbit-card-value">{summary.waterMl ?? 0} ml</p>
              <p className="fitbit-card-sub">Today</p>
            </div>
              <button
                type="button"
                style={{ background: 'transparent', border: 'none', padding: 0, cursor: waterBusy ? 'not-allowed' : 'pointer', opacity: waterBusy ? 0.7 : 1 }}
                onClick={addWater}
                title="Thêm nước"
                disabled={waterBusy}
              >
              <ProgressRing
                ariaLabel={`Tiến độ nước: ${summary.waterMl ?? 0} / ${WATER_GOAL_ML} ml`}
                progress={waterPct}
                color="#3b82f6"
                iconClass="bi bi-droplet-half"
              />
            </button>
          </div>
        </div>
      </section>

      <section className="today-section">
        <h2 className="today-section-title">Activity</h2>
        <div className="today-cards today-cards--2col">
          <div className="fitbit-card">
            <div className="fitbit-card-body">
              <p className="fitbit-card-title">Exercise days</p>
              <p className="fitbit-card-value">{weekData.filter(v => v > 0).length} of 7</p>
              <p className="fitbit-card-sub">This week (Cals burned)</p>
            </div>
            <div className="exercise-week-wrap">
              <div className="exercise-bars" style={{ display: 'flex', alignItems: 'flex-end', height: '40px', gap: '5px' }}>
                {WEEK_DAYS.map((d, i) => {
                  const val = weekData[i];
                  const maxVal = Math.max(...weekData, 1); // fix div by 0
                  const isZero = val === 0;
                  const heightPct = isZero ? 15 : Math.max(15, Math.min(100, Math.round((val / maxVal) * 100)));
                  // Tính opacity: từ 0.3 lên tối đa 1.0 tùy theo mức độ hoạt động. 
                  const opacity = isZero ? 0.1 : Math.max(0.4, val / maxVal);

                  return (
                    <div key={d + i} style={{
                      width: '18px',
                      borderRadius: '4px',
                      height: `${heightPct}%`,
                      background: isZero ? 'rgba(255,255,255,0.05)' : `rgba(0, 176, 185, ${opacity})`,
                      transition: 'all 0.4s ease'
                    }} />
                  );
                })}
              </div>
              <div className="exercise-days-labels">
                {WEEK_DAYS.map((d, i) => (
                  <span key={`lbl-${d}-${i}`}>{d}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="fitbit-card">
            <div className="fitbit-card-body">
              <p className="fitbit-card-title">Energy burned</p>
              <p className="fitbit-card-value">{(summary.caloriesBurned ?? 0).toLocaleString()} / {targetBurn} kcal</p>
              <p className="fitbit-card-sub" style={{ color: (summary.caloriesBurned || 0) >= targetBurn ? '#10b981' : '#f87171' }}>
                {(summary.caloriesBurned || 0) >= targetBurn
                  ? 'Đã đạt chỉ tiêu!'
                  : (excessCals > 0
                    ? `Phạt: Cần đốt thêm ${targetBurn - (summary.caloriesBurned || 0)} kcal do lố ăn uống`
                    : `Bạn cần đốt thêm ${targetBurn - (summary.caloriesBurned || 0)} kcal`)}
              </p>
            </div>
            <ProgressRing
              ariaLabel={`Tiến độ đốt cháy: ${summary.caloriesBurned || 0} / ${targetBurn} kcal`}
              progress={burnPct}
              color="#f43f5e"
              iconClass="bi bi-fire"
            />
          </div>
        </div>
      </section>

      <section className="today-section">
        <h2 className="today-section-title">Health</h2>
        <div className="today-cards today-cards--3col">
          <div className="fitbit-card">
            <div className="fitbit-card-body">
              <p className="fitbit-card-title">Weight</p>
              <p className="fitbit-card-value">{user?.measurements?.weight ?? '—'} kg</p>
              <p className="fitbit-card-sub" style={{ color: 'var(--fitbit-teal)' }}>
                {user?.goals?.targetWeight && user?.measurements?.weight
                  ? `Còn ${Math.abs(user.measurements.weight - user.goals.targetWeight).toFixed(1)} kg tới mục tiêu!`
                  : 'Chưa cập nhật từ hồ sơ'}
              </p>
            </div>
            {(() => {
              const cw = user?.measurements?.weight;
              const tw = user?.goals?.targetWeight;
              if (!cw || !tw) {
                return <ProgressRing ariaLabel="Tiến độ cân nặng" progress={0} color="var(--fitbit-teal)" iconClass="bi bi-speedometer2" />;
              }
              // Ước lượng điểm xuất phát: +10% so mục tiêu (hành trình chuẩn)
              const startW = tw < cw ? Math.max(cw, tw * 1.1) : Math.min(cw, tw * 0.9);
              const totalJourney = Math.abs(startW - tw);
              const remaining = Math.abs(cw - tw);
              const pct = Math.round(Math.max(0, Math.min(100, ((totalJourney - remaining) / totalJourney) * 100)));
              const done = Math.abs(cw - tw) < 0.5;
              const color = done ? '#22c55e' : pct >= 60 ? '#00B0B9' : '#f97316';
              return <ProgressRing ariaLabel="Tiến độ cân nặng" progress={pct} color={color} iconClass="bi bi-speedometer2" />;
            })()}
          </div>
          <div className="fitbit-card">
            <div className="fitbit-card-body">
              <p className="fitbit-card-title">Glucose (Đường)</p>
              <p className="fitbit-card-value">{consumedGlucose} / {targetGlucose} g</p>
              <p className="fitbit-card-sub" style={{ color: consumedGlucose > targetGlucose ? '#ef4444' : 'var(--fitbit-muted)' }}>
                {consumedGlucose > targetGlucose ? `Bạn đã nạp lố đường mốc an toàn` : `Hôm nay`}
              </p>
            </div>
            <ProgressRing
              ariaLabel={`Glucose: ${consumedGlucose} / ${targetGlucose} g`}
              progress={glucosePct}
              color={consumedGlucose > targetGlucose ? "#ef4444" : "#f43f5e"}
              iconClass="bi bi-droplet-half"
            />
          </div>
          <div className="fitbit-card">
            <div className="fitbit-card-body">
              <p className="fitbit-card-title">Sleep</p>
              <p className="fitbit-card-value">
                {summary.sleepMinutes != null
                  ? `${Math.floor(summary.sleepMinutes / 60)}h ${summary.sleepMinutes % 60}m`
                  : 'Chưa có'}
              </p>
              {(() => {
                const targetSleepMins = user?.gender === 'female' ? 8 * 60 : 7 * 60;
                const sm = summary.sleepMinutes;
                if (sm == null) return <p className="fitbit-card-sub">Mục tiêu: {targetSleepMins / 60}h</p>;
                if (sm < targetSleepMins) return <p className="fitbit-card-sub" style={{ color: '#ef4444' }}>Thiếu {Math.floor((targetSleepMins - sm) / 60)}h {(targetSleepMins - sm) % 60}m</p>;
                return <p className="fitbit-card-sub" style={{ color: '#22c55e' }}>Đã đủ giấc ✅</p>;
              })()}
            </div>
            {(() => {
              const targetSleepMins = user?.gender === 'female' ? 8 * 60 : 7 * 60;
              const sm = summary.sleepMinutes || 0;
              const pct = Math.round((sm / targetSleepMins) * 100);
              const color = sm === 0 ? 'var(--fitbit-muted)' : sm < targetSleepMins ? '#ef4444' : '#22c55e';
              return (
                <ProgressRing
                  ariaLabel={`Giấc ngủ: ${sm} phút / mục tiêu ${targetSleepMins} phút`}
                  progress={pct}
                  color={color}
                  iconClass="bi bi-moon-stars"
                />
              );
            })()}
          </div>
        </div>
      </section>

      {/* AI Recommendation Modal */}
      {showAiModal && (
        <div className="coach-modal-overlay" style={{ zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', background: 'rgba(0,0,0,0.6)' }} onClick={() => setShowAiModal(false)}>
          <div className="coach-modal" style={{ 
            width: '90%', maxWidth: '520px', 
            background: 'linear-gradient(180deg, rgba(30,41,59,0.95) 0%, rgba(15,23,42,0.95) 100%)', 
            borderRadius: '24px', 
            padding: '32px', 
            boxShadow: '0 24px 60px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.1)',
            border: '1px solid rgba(139, 92, 246, 0.25)',
            position: 'relative',
            overflow: 'hidden'
          }} onClick={(e) => e.stopPropagation()}>
            {/* Ambient bg glow */}
            <div style={{ position: 'absolute', top: '-60px', left: '-60px', width: '220px', height: '220px', background: 'rgba(139, 92, 246, 0.2)', filter: 'blur(60px)', borderRadius: '50%', pointerEvents: 'none' }}></div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ 
                  width: '52px', height: '52px', borderRadius: '16px', 
                  background: 'linear-gradient(135deg, #8b5cf6, #0ea5e9)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                  boxShadow: '0 8px 16px rgba(139, 92, 246, 0.4)'
                }}>
                  <i className="bi bi-stars" style={{ fontSize: '1.5rem' }}></i>
                </div>
                <div>
                  <h3 style={{ margin: 0, color: '#fff', fontSize: '1.35rem', fontWeight: 700 }}>AI Gợi ý</h3>
                  <span style={{ fontSize: '0.85rem', color: '#a78bfa', fontWeight: 600 }}>Cá nhân hoá từ mục tiêu của bạn</span>
                </div>
              </div>
              <button type="button" onClick={() => setShowAiModal(false)} style={{ background: 'rgba(255,255,255,0.08)', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', color: '#fff', cursor: 'pointer', transition: 'all 0.2s', padding: 0 }}>
                <i className="bi bi-x" style={{ fontSize: '1.3rem' }} />
              </button>
            </div>
            
            <div 
              style={{ position: 'relative', lineHeight: 1.7, fontSize: '0.95rem', color: 'rgba(255,255,255,0.85)', background: 'rgba(0,0,0,0.25)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}
              dangerouslySetInnerHTML={{ __html: aiReco.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #fff; text-shadow: 0 0 10px rgba(14, 165, 233, 0.4)">$1</strong>').replace(/\*(.*?)\*/g, '<em style="color: #a78bfa">$1</em>').replace(/\n/g, '<br/>') }}
            />
            
            <button 
              className="w-100 mt-4" 
              style={{ 
                border: 'none', padding: '16px', borderRadius: '16px', 
                background: 'linear-gradient(135deg, #8b5cf6, #0ea5e9)', 
                color: '#fff', fontWeight: 600, fontSize: '1.05rem', 
                letterSpacing: '0.5px', cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(14, 165, 233, 0.3)',
                transition: 'all 0.2s'
              }} 
              onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(14, 165, 233, 0.4)'; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(14, 165, 233, 0.3)'; }}
              onClick={() => setShowAiModal(false)}
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Today;
