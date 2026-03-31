import React, { Component, useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import { useUser } from '../context/UserContext';
import dailySummaryService from '../services/dailySummaryService';
import workoutService from '../services/workoutService';
import nutritionService from '../services/nutritionService';
import userService from '../services/userService';
import healthLogService from '../services/healthLogService';
import toast from 'react-hot-toast';
import { calcSmartTargets } from '../utils/smartGoalCalc';
import Model from 'react-body-highlighter';

const CHART_COLORS = {
  teal: '#00B0B9',
  tealLight: 'rgba(0, 176, 185, 0.25)',
  muted: '#9ca3af',
  doughnut: ['#00B0B9', '#6b7280', '#4b5563', '#374151'],
};

const MUSCLE_MAPPING = {
  'Ngực': ['chest'],
  'Lưng': ['upper-back', 'lower-back', 'trapezius', 'back-deltoids'],
  'Vai': ['front-deltoids', 'trapezius'],
  'Chân': ['quadriceps', 'hamstring', 'calves', 'gluteal', 'adductor', 'abductors'],
  'Tay': ['biceps', 'triceps', 'forearm'],
  'Bụng': ['abs', 'obliques'],
  'Toàn thân': ['chest', 'upper-back', 'front-deltoids', 'quadriceps', 'abs', 'biceps', 'triceps'],
  'Tim mạch': ['calves', 'quadriceps']
};

class MuscleMapErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, errorMsg: "" }; }
  static getDerivedStateFromError(error) { return { hasError: true, errorMsg: error.message }; }
  render() { 
    if (this.state.hasError) return <div style={{color:'#fca5a5', padding:'20px'}}>Lỗi Heatmap: {this.state.errorMsg}</div>; 
    return this.props.children; 
  }
}

function calcBmi(weightKg, heightCm) {
  if (!weightKg || !heightCm || heightCm <= 0) return null;
  return (weightKg / ((heightCm / 100) ** 2)).toFixed(1);
}

function getBmiCategory(bmiValue) {
  const v = Number(bmiValue);
  if (!Number.isFinite(v) || v <= 0) {
    return { label: '—' };
  }

  // Adult BMI classification (WHO/CDC-like for adults)
  if (v < 18.5) return { label: 'Gầy' };
  if (v < 25) return { label: 'Bình thường' };
  if (v < 30) return { label: 'Thừa cân' };
  return { label: 'Béo phì' };
}

const BODY_COMP_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function Stats() {
  const { user, loading: userLoading } = useUser();
  const [todaySummary, setTodaySummary] = useState(null);
  const [workoutHistory, setWorkoutHistory] = useState([]);
  const [calHistory, setCalHistory] = useState([]);
  const [nutritionHistory, setNutritionHistory] = useState([]);
  const [muscleMapView, setMuscleMapView] = useState('anterior');
  const [chartPeriod, setChartPeriod] = useState('week');
  const [showReportModal, setShowReportModal] = useState(false);

  // Smart Goal Planner States
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [plannerBusy, setPlannerBusy] = useState(false);
  const [goalParams, setGoalParams] = useState({ currentWeight: 70, targetWeight: 65, durationWeeks: 4 });
  const [plannerResult, setPlannerResult] = useState(null);
  const [plannerError, setPlannerError] = useState('');

  const bodyCompRef = useRef(null);
  const intakeRef = useRef(null);
  const sleepChartRef = useRef(null);
  const proportionsRef = useRef(null);
  const weightChartRef = useRef(null);

  const [weightHistoryLog, setWeightHistoryLog] = useState([]);
  const [weightUpdateOpen, setWeightUpdateOpen] = useState(false);
  const [newWeight, setNewWeight] = useState('');

  useEffect(() => {
    Promise.all([
      dailySummaryService.getToday(),
      workoutService.getHistory(),
      dailySummaryService.getHistory({ days: 7 }),
      nutritionService.getHistory(),
      healthLogService.getWeightHistory()
    ]).then(([todayRes, workoutRes, historyRes, nutRes, weightRes]) => {
      setTodaySummary(todayRes.data);
      setWorkoutHistory(workoutRes.data?.data || []);
      const hist = historyRes.data?.data || historyRes.data || [];
      setCalHistory([...hist].reverse());
      setNutritionHistory(nutRes.data?.data || []);
      setWeightHistoryLog(weightRes.data || []);
    }).catch(err => console.error('Lỗi lấy thống kê', err));
  }, []);

  const weight = user?.measurements?.weight;
  const height = user?.measurements?.height;
  const waist = user?.measurements?.waist;
  const targetWeight = user?.goals?.targetWeight;
  const bmi = user?.autoStats?.bmi ?? (weight && height ? calcBmi(weight, height) : null);
  const targetBmi = user?.autoStats?.targetBmi ?? (targetWeight != null && height ? calcBmi(targetWeight, height) : null);
  
  // Tính tổng vĩ mô Protein, Carbs, Fat cho doughnut chart
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;

  // Cập nhật biểu đồ Macros từ dữ liệu Dinh Dưỡng
  nutritionHistory.forEach(n => {
    totalProtein += (n.macros?.protein || 0);
    totalCarbs += (n.macros?.carbs || 0);
    totalFat += (n.macros?.fat || 0);
  });

  // Tính calo đốt cháy từ dữ liệu Workout trực tiếp (đáng tin cậy hơn DailySummary vì không bị stale)
  const burnByDate = {};
  workoutHistory.forEach(w => {
    const nd = new Date(w.date);
    const dStr = `${nd.getFullYear()}-${String(nd.getMonth() + 1).padStart(2, '0')}-${String(nd.getDate()).padStart(2, '0')}`;
    // Ưu tiên caloriesBurned từ Workout, fallback tính 6kcal/phút từ duration
    const burned = w.caloriesBurned > 0 ? w.caloriesBurned : (w.totalDurationMinutes || 0) * 6;
    burnByDate[dStr] = (burnByDate[dStr] || 0) + burned;
  });
  // Cộng thêm từ DailySummary cho ngày hôm nay (vì workout session chưa save)
  const todayBurnFromSummary = todaySummary?.caloriesBurned || 0;
  if (todayBurnFromSummary > 0) {
    const t = new Date();
    const tStr = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
    burnByDate[tStr] = Math.max(burnByDate[tStr] || 0, todayBurnFromSummary);
  }


  const chartLabels = [];
  const chartData = []; // Đốt cháy (Burned)
  const intakeData = []; // Nạp vào (Consumed)
  const daysCount = chartPeriod === 'week' ? 7 : 30;
  const today = new Date();

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    
    if (chartPeriod === 'week') {
      const weekdays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
      chartLabels.push(weekdays[d.getDay()]);
    } else {
      chartLabels.push(d.getDate().toString());
    }
    chartData.push(burnByDate[dStr] || 0);
    
    // Tính toán từ nutritionHistory
    let dIntake = 0;
    nutritionHistory.forEach(n => {
      const nd = new Date(n.date);
      const ndStr = `${nd.getFullYear()}-${String(nd.getMonth() + 1).padStart(2, '0')}-${String(nd.getDate()).padStart(2, '0')}`;
      if (ndStr === dStr) dIntake += (n.macros?.calories || 0);
    });
    intakeData.push(dIntake);
  }

  const smartTargets = calcSmartTargets(user);
  const targetCals = smartTargets?.targetIntake ?? (user?.autoStats?.tdee ?? 2000);
  const targetBurn = smartTargets?.targetBurn ?? 300;
  
  const targetDataArray = Array(daysCount).fill(targetCals);
  const targetBurnArray = [];

  // Tính bù trừ chỉ tiêu phạt (Penalty): Nếu ăn lố trong quá khứ, nâng vạch chỉ tiêu đốt cháy ngày đó lên
  for (let i = 0; i < daysCount; i++) {
    const intake = intakeData[i] || 0;
    const excess = intake > targetCals ? (intake - targetCals) : 0;
    targetBurnArray.push(targetBurn + excess);
  }

  // Fallback safe value for doughnut chart
  if (totalProtein === 0 && totalCarbs === 0 && totalFat === 0) {
    totalProtein = 1; totalCarbs = 1; totalFat = 1; // avoid division by 0 visual bugs
  }
  
  const macroProportions = [
    { label: 'Protein (Đạm)', value: totalProtein, color: '#f43f5e' }, // fitbit-rose
    { label: 'Carbs (Tinh bột)', value: totalCarbs, color: '#eab308' }, // yellow
    { label: 'Fat (Chất béo)', value: totalFat, color: '#00B0B9' }, // fitbit-teal
  ];

  // Text báo cáo (dựa theo biểu đồ) để người dùng không phải tự đọc chart.
  const periodLabel = chartPeriod === 'week' ? '7 ngày qua' : '30 ngày qua';
  const safeDaysCount = Math.max(1, daysCount);
  const sumBurn = chartData.reduce((s, v) => s + (v || 0), 0);
  const sumIntake = intakeData.reduce((s, v) => s + (v || 0), 0);
  const avgBurn = Math.round(sumBurn / safeDaysCount);
  const avgTargetBurn = targetBurnArray.length
    ? Math.round(targetBurnArray.reduce((s, v) => s + (v || 0), 0) / Math.max(1, targetBurnArray.length))
    : null;
  const avgIntake = Math.round(sumIntake / safeDaysCount);
  const overDays = intakeData.filter((v) => (v || 0) > targetCals).length;

  // --- Dữ liệu dùng cho phần “text report” sâu hơn ---
  const burnDiffs = chartData.map((v, i) => (v || 0) - (targetBurnArray[i] || 0));
  const burnAchievedDays = burnDiffs.filter((d) => d >= 0).length;
  const burnNotAchievedDays = Math.max(0, safeDaysCount - burnAchievedDays);

  const intakeDiffs = intakeData.map((v) => (v || 0) - targetCals);
  const withinIntakeRangeDays = intakeData.filter((v) => Math.abs((v || 0) - targetCals) <= 100).length;
  const underDays = intakeData.filter((v) => (v || 0) > 0 && (v || 0) < targetCals - 100).length;
  const bothAchievedDays = chartData.reduce((acc, burned, i) => {
    const okBurn = (burned || 0) >= (targetBurnArray[i] || 0);
    const okIntake = Math.abs((intakeData[i] || 0) - targetCals) <= 100;
    return acc + (okBurn && okIntake ? 1 : 0);
  }, 0);
  const overallCompletionPct = Math.round((bothAchievedDays / safeDaysCount) * 100);

  const bestBurnIdx = burnDiffs.reduce((best, d, i) => (d > burnDiffs[best] ? i : best), 0);
  const worstBurnIdx = burnDiffs.reduce((worst, d, i) => (d < burnDiffs[worst] ? i : worst), 0);
  const bestIntakeIdx = intakeDiffs.reduce((best, d, i) => (Math.abs(d) < Math.abs(intakeDiffs[best]) ? i : best), 0);

  const macroCaloriesTotal = (totalProtein * 4) + (totalCarbs * 4) + (totalFat * 9);
  const proteinPct = macroCaloriesTotal > 0 ? Math.round((totalProtein * 4 / macroCaloriesTotal) * 100) : 0;
  const carbsPct = macroCaloriesTotal > 0 ? Math.round((totalCarbs * 4 / macroCaloriesTotal) * 100) : 0;
  const fatPct = macroCaloriesTotal > 0 ? Math.round((totalFat * 9 / macroCaloriesTotal) * 100) : 0;

  // Mục tiêu ngủ theo giới tính (phút)
  const targetSleepMins = user?.gender === 'female' ? 8 * 60 : 7 * 60;

  // Xây dựng dữ liệu giấc ngủ 7 ngày (CN → T7) từ calHistory
  const SLEEP_WEEK_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const sleepWeek = [null, null, null, null, null, null, null]; // null = chưa có dữ liệu
  const todayForSleep = new Date();
  calHistory.forEach(h => {
    const d = new Date(h.date);
    const diffDays = Math.round((todayForSleep - d) / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays <= 6 && h.sleepMinutes != null) {
      sleepWeek[d.getDay()] = h.sleepMinutes;
    }
  });
  // Thêm dữ liệu hôm nay từ todaySummary nếu có
  if (todaySummary?.sleepMinutes != null) {
    sleepWeek[todayForSleep.getDay()] = todaySummary.sleepMinutes;
  }

  // Hàm tính màu thanh theo mức độ giấc ngủ
  const getSleepBarColor = (mins) => {
    if (mins === null) return 'rgba(255,255,255,0.08)';
    const diff = mins - targetSleepMins;
    if (diff >= 120) return '#1d4ed8';     // Thừa >2h: xanh dương đậm
    if (diff >= 0)   return diff >= 60 ? '#60a5fa' : '#22c55e'; // Thừa 0-1h: xanh lá, 1-2h: xanh dương nhạt
    if (diff > -120) return '#fca5a5';    // Thiếu 1-2h: đỏ nhạt
    return '#ef4444';                      // Thiếu >2h: đỏ đậm
  };


  const userStatsRows = [
    { icon: 'bi-person', label: 'Tên', value: user?.name ?? '—' },
    {
      icon: 'bi-person-badge',
      label: 'BMI',
      value:
        bmi != null
          ? `${bmi} · ${getBmiCategory(bmi).label}`
          : '—',
    },
    { icon: 'bi-rulers', label: 'Chiều cao', value: height != null ? `${height} cm` : '—' },
    { icon: 'bi-speedometer2', label: 'Cân nặng', value: weight != null ? `${weight} kg` : '—' },
    { icon: 'bi-bullseye', label: 'Mục tiêu cân nặng', value: targetWeight != null ? `${targetWeight} kg` : '—' },
    { icon: 'bi-heart-half', label: 'Mục tiêu BMI', value: targetBmi ?? '—' },
  ];

  useEffect(() => {
    if (!bodyCompRef.current) return;
    const ctx = bodyCompRef.current.getContext('2d');
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: chartLabels,
        datasets: [
          {
            label: 'Mục tiêu Đốt cháy',
            data: targetBurnArray,
            borderColor: 'rgba(255, 255, 255, 0.3)',
            borderDash: [5, 5],
            borderWidth: 2,
            pointRadius: 0,
            fill: false,
          },
          {
            label: 'Calo đốt được (kcal)',
            data: chartData,
            borderColor: CHART_COLORS.teal,
            backgroundColor: CHART_COLORS.tealLight,
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: CHART_COLORS.teal,
          }
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(37, 38, 42, 0.95)',
            titleColor: '#fff',
            bodyColor: CHART_COLORS.teal,
          },
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.06)' },
            ticks: { color: CHART_COLORS.muted, font: { size: 11 } },
          },
          y: {
            min: 0,
            grid: { color: 'rgba(255,255,255,0.06)' },
            ticks: { color: CHART_COLORS.muted, font: { size: 11 } },
          },
        },
      },
    });
    return () => chart.destroy();
  }, [chartPeriod, chartData]);

  useEffect(() => {
    if (!intakeRef.current) return;
    const ctx = intakeRef.current.getContext('2d');
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: chartLabels,
        datasets: [
          {
            label: 'Chỉ tiêu (TDEE)',
            data: targetDataArray,
            borderColor: 'rgba(255, 255, 255, 0.3)',
            borderDash: [5, 5],
            borderWidth: 2,
            pointRadius: 0,
            fill: false,
            order: 2,
          },
          {
            type: 'bar',
            label: 'Calo nạp vào (kcal)',
            data: intakeData,
            backgroundColor: intakeData.map(val => val > targetCals ? '#ef4444' : '#eab308'),
            borderRadius: 4,
            order: 1,
            barPercentage: 0.6,
          }
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(37, 38, 42, 0.95)',
            titleColor: '#fff',
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: CHART_COLORS.muted, font: { size: 11 } },
          },
          y: {
            min: 0,
            max: Math.max(...intakeData, targetCals + 500),
            grid: { color: 'rgba(255,255,255,0.06)' },
            ticks: { color: CHART_COLORS.muted, font: { size: 11 } },
          },
        },
      },
    });
    return () => chart.destroy();
  }, [chartPeriod, intakeData, targetCals]);

  useEffect(() => {
    if (!sleepChartRef.current) return;
    const ctx = sleepChartRef.current.getContext('2d');
    const sleepDataInHours = sleepWeek.map(v => v !== null ? +(v / 60).toFixed(2) : null);
    const targetH = +(targetSleepMins / 60).toFixed(1);
    const barColors = sleepWeek.map(getSleepBarColor);

    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: SLEEP_WEEK_LABELS,
        datasets: [
          {
            label: 'Mục tiêu giấc ngủ',
            data: Array(7).fill(targetH),
            type: 'line',
            borderColor: 'rgba(255,255,255,0.45)',
            borderDash: [6, 4],
            borderWidth: 2,
            pointRadius: 0,
            fill: false,
            order: 0,
          },
          {
            label: 'Số giờ ngủ',
            data: sleepDataInHours,
            backgroundColor: barColors,
            borderRadius: 6,
            barPercentage: 0.65,
            categoryPercentage: 0.8,
            order: 1,
          }
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(37, 38, 42, 0.95)',
            titleColor: '#fff',
            callbacks: {
              label: (ctx) => {
                const raw = ctx.raw;
                if (raw === null) return 'Chưa có dữ liệu';
                const diff = raw - targetH;
                const status = diff >= 0
                  ? (diff >= 2 ? '🔵 Thừa nhiều' : diff >= 1 ? '🔵 Thừa ít' : '🟢 Đủ giấc')
                  : (diff > -2 ? '🔴 Thiếu ít' : '🔴 Thiếu nhiều');
                return `${raw.toFixed(1)}h — ${status}`;
              }
            }
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: CHART_COLORS.muted, font: { size: 11 } },
          },
          y: {
            min: 0,
            max: Math.max(...sleepDataInHours.filter(v => v !== null), targetH + 2),
            grid: { color: 'rgba(255,255,255,0.06)' },
            ticks: {
              color: CHART_COLORS.muted,
              font: { size: 11 },
              callback: (v) => `${v}h`,
            },
          },
        },
      },
    });
    return () => chart.destroy();
  }, [calHistory, todaySummary, user]);


  useEffect(() => {
    if (!proportionsRef.current) return;
    const ctx = proportionsRef.current.getContext('2d');
    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: macroProportions.map((p) => p.label),
        datasets: [{
          data: macroProportions.map((p) => p.value),
          backgroundColor: macroProportions.map((p) => p.color),
          borderWidth: 0,
          hoverOffset: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: { color: CHART_COLORS.muted, font: { size: 11 }, padding: 12, usePointStyle: true },
          },
          tooltip: {
            backgroundColor: 'rgba(37, 38, 42, 0.95)',
            callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.raw}g` },
          },
        },
      },
    });
    return () => chart.destroy();
  }, [nutritionHistory]);

  const calculateSmartGoal = async () => {
    if (plannerBusy) return;
    setPlannerBusy(true);
    try {
      const { currentWeight, targetWeight, durationWeeks } = goalParams;
      const diff = currentWeight - targetWeight;
      if (diff <= 0) {
        setPlannerError('Cân nặng mục tiêu phải nhỏ hơn cân nặng hiện tại.');
        return;
      }
      const safeMaxLoss = currentWeight * 0.01;
      const reqLoss = diff / durationWeeks;
      if (reqLoss > safeMaxLoss) {
        setPlannerResult(null);
        setPlannerError(`Tốc độ không an toàn! Tối đa ${safeMaxLoss.toFixed(1)}kg/tuần → cần tối thiểu ${Math.ceil(diff / safeMaxLoss)} tuần.`);
        return;
      }
      setPlannerError('');
      setPlannerResult(null);

    // Tính các chỉ tiêu cơ bản
    const totalKcalDeficit = diff * 7700;                                   // kcal cần đốt tổng
    const dailyDeficit     = Math.round(totalKcalDeficit / (durationWeeks * 7)); // kcal/ngày
    const tdee             = user?.autoStats?.tdee ?? 2000;
    const dailyIntake      = Math.max(1200, tdee - dailyDeficit);           // kcal nạp vào ≥ 1200

    // Lấy danh sách bài tập từ API
    let allExercises = [];
    try {
      const res = await workoutService.getExercises();
      allExercises = res.data?.data || [];
    } catch {
      return setPlannerError('Không lấy được dữ liệu bài tập. Kiểm tra kết nối server.');
    }
    if (allExercises.length === 0) {
      setPlannerError('Chưa có bài tập trong cơ sở dữ liệu.');
      return;
    }

    // Nhóm bài tập theo nhóm cơ – 6 nhóm bắt buộc
    const REQUIRED_GROUPS = ['Ngực', 'Lưng', 'Vai', 'Chân', 'Tay', 'Bụng'];
    const byGroup = {};
    allExercises.forEach(ex => {
      if (!byGroup[ex.muscleGroup]) byGroup[ex.muscleGroup] = [];
      byGroup[ex.muscleGroup].push(ex);
    });

    // Bước 1: Chọn 1 bài đại diện mỗi nhóm cơ bắt buộc (ưu tiên nhiều calo nhất để đạt target nhanh)
    const selected = []; // { exercise, sets }
    let totalBurn = 0;

    REQUIRED_GROUPS.forEach(group => {
      const pool = byGroup[group] || [];
      if (pool.length === 0) return;
      // Chọn bài có calPerSet cao nhất trong nhóm
      const best = pool.reduce((a, b) => ((b.caloriesPerSet || 15) > (a.caloriesPerSet || 15) ? b : a));
      const sets = best.defaultSets || 3;
      const cal = (best.caloriesPerSet || 15) * sets;
      selected.push({ exercise: best, sets, cal });
      totalBurn += cal;
    });

    // Bước 2: Nếu chưa đủ target → thêm sets hoặc bài thứ 2 vào nhóm calorie cao nhất
    // Ưu tiên thứ tự nhóm cơ lớn: Chân > Lưng > Ngực > Vai > Tay > Bụng
    const PRIORITY_EXTRA = ['Chân', 'Lưng', 'Ngực', 'Vai', 'Tay', 'Bụng'];
    let pass = 0;
    while (totalBurn < dailyDeficit && pass < 20) {
      pass++;
      let added = false;
      for (const group of PRIORITY_EXTRA) {
        if (totalBurn >= dailyDeficit) break;
        const pool = byGroup[group] || [];
        // Thêm bài thứ 2 trong nhóm nếu có và chưa được chọn
        const alreadyChosenIds = new Set(selected.map(s => s.exercise._id));
        const extra = pool.find(ex => !alreadyChosenIds.has(ex._id));
        if (extra) {
          const sets = extra.defaultSets || 3;
          const cal = (extra.caloriesPerSet || 15) * sets;
          selected.push({ exercise: extra, sets, cal });
          totalBurn += cal;
          added = true;
        } else {
          // Không còn bài mới → thêm 1 set vào bài đã có trong nhóm
          const existing = selected.find(s => s.exercise.muscleGroup === group);
          if (existing) {
            existing.sets += 1;
            existing.cal += (existing.exercise.caloriesPerSet || 15);
            totalBurn += (existing.exercise.caloriesPerSet || 15);
            added = true;
          }
        }
      }
      if (!added) break;
    }

    // Bước 3: Nếu vẫn thiếu → thêm bài Cardio
    if (totalBurn < dailyDeficit) {
      const cardio = allExercises.find(ex => ex.muscleGroup === 'Tim mạch' || ex.type === 'Cardio');
      if (cardio) {
        const sets = Math.ceil((dailyDeficit - totalBurn) / (cardio.caloriesPerSet || 50));
        const cal = sets * (cardio.caloriesPerSet || 50);
        selected.push({ exercise: cardio, sets, cal });
        totalBurn += cal;
      }
    }

    const freq = dailyDeficit > 500 ? '5-6 buổi/tuần' : dailyDeficit > 300 ? '4-5 buổi/tuần' : '3 buổi/tuần';
    const water = ((currentWeight * 35 + (dailyDeficit > 300 ? 500 : 0)) / 1000).toFixed(1);

    setPlannerResult({ dailyDeficit, dailyIntake, freq, water, exercises: selected, totalBurn });
    } catch {
      setPlannerError('Phân tích lộ trình thất bại. Vui lòng thử lại.');
    } finally {
      setPlannerBusy(false);
    }
  };


  const handleSaveSmartGoal = async () => {
    try {
      await userService.updateProfile({
        goals: { targetWeight: goalParams.targetWeight }
      });
      toast.success(`Đã lưu mục tiêu: ${goalParams.targetWeight}kg trong ${goalParams.durationWeeks} tuần!`);
      setPlannerOpen(false);
    } catch {
      toast.error('Lưu mục tiêu thất bại. Vui lòng thử lại.');
    }
  };

  const muscleIntensity = {};
  workoutHistory.forEach(w => {
    w.exercises?.forEach(ex => {
      const mg = ex.muscleGroup;
      if (mg) {
        if (!muscleIntensity[mg]) muscleIntensity[mg] = 0;
        muscleIntensity[mg] += (ex.completedSets?.length || ex.sets || 1);
      }
    });
    if ((!w.exercises || w.exercises.length === 0) && w.muscleGroup) {
      if (!muscleIntensity[w.muscleGroup]) muscleIntensity[w.muscleGroup] = 0;
      muscleIntensity[w.muscleGroup] += 4;
    }
  });

  const bodyHighlighterData = Object.keys(muscleIntensity)
    .filter(mg => MUSCLE_MAPPING[mg] && MUSCLE_MAPPING[mg].length > 0)
    .map(mg => {
      return {
        name: mg,
        muscles: MUSCLE_MAPPING[mg],
        frequency: Math.max(1, Math.min(Math.ceil(muscleIntensity[mg] / 3), 4)) // scale down raw sets strictly to 1-4 heat index max
      };
    });

  let maxIntensity = 0;
  let focusGroupLabel = 'Chưa có dữ liệu';
  Object.entries(muscleIntensity).forEach(([mg, freq]) => {
    if (freq > maxIntensity) {
      maxIntensity = freq;
      focusGroupLabel = mg;
    }
  });

  const handleSaveWeight = async () => {
    const w = Number(newWeight);
    if (!w || isNaN(w) || w < 20 || w > 300) {
      return toast.error('Cân nặng phải từ 20 đến 300 kg');
    }
    try {
      await healthLogService.addWeightLog(w);
      const weightRes = await healthLogService.getWeightHistory();
      setWeightHistoryLog(weightRes.data || []);
      if (user?.measurements) user.measurements.weight = w;
      toast.success('Cập nhật cân nặng thành công!');
      setWeightUpdateOpen(false);
    } catch {
      toast.error('Cập nhật cân nặng thất bại. Vui lòng thử lại.');
    }
  };

  useEffect(() => {
    if (!weightChartRef.current || weightHistoryLog.length === 0) return;
    const ctx = weightChartRef.current.getContext('2d');
    const labels = weightHistoryLog.map(log => {
      const d = new Date(log.date);
      return `${d.getDate()}/${d.getMonth()+1}`;
    });
    const data = weightHistoryLog.map(log => log.value);

    let chartStatus = Chart.getChart(ctx);
    if (chartStatus !== undefined) chartStatus.destroy();

    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Cân nặng (kg)',
          data,
          borderColor: CHART_COLORS.teal,
          backgroundColor: CHART_COLORS.tealLight,
          borderWidth: 2,
          fill: true,
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: CHART_COLORS.teal,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(37, 38, 42, 0.95)',
            titleColor: '#fff',
            bodyColor: CHART_COLORS.teal,
          },
        },
        scales: {
          x: { ticks: { color: CHART_COLORS.muted }, grid: { display: false } },
          y: { 
            ticks: { color: CHART_COLORS.muted }, 
            grid: { color: 'rgba(255,255,255,0.06)' },
            suggestedMin: Math.min(...data) - 2,
            suggestedMax: Math.max(...data) + 2
          }
        }
      }
    });
    return () => chart.destroy();
  }, [weightHistoryLog]);

  if (userLoading && !user) {
    return (
      <div className="stats-page">
        <h1 className="stats-page-title">Thống kê tiến độ</h1>
        <div className="stats-row stats-row--top">
          <div className="stats-user-card fitbit-card stats-user-card--skeleton">
            <div className="stats-user-grid">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="stats-user-item">
                  <div className="skeleton-block" style={{ width: 32, height: 32, borderRadius: 8 }} />
                  <div className="skeleton-block" style={{ width: 60, height: 14 }} />
                  <div className="skeleton-block" style={{ width: 48, height: 18 }} />
                </div>
              ))}
            </div>
          </div>
          <div className="stats-muscle-card fitbit-card">
            <div className="skeleton-block" style={{ height: 200, borderRadius: 14 }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="stats-page">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="stats-page-title m-0">Thống kê tiến độ</h1>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-outline-light border-secondary rounded-pill d-flex align-items-center px-3" onClick={() => {
            setNewWeight(weight || '');
            setWeightUpdateOpen(true);
          }}>
            <i className="bi bi-speedometer2 me-2" /> Cập nhật cân nặng
          </button>
          <button type="button" className="btn btn-fitbit rounded-pill d-flex align-items-center px-4" onClick={() => {
            setGoalParams({ ...goalParams, currentWeight: weight || 70, targetWeight: targetWeight || 65 });
            setPlannerOpen(true);
          }}>
            <i className="bi bi-gem me-2" /> Lập lộ trình Smart Goal
          </button>
        </div>
      </div>

      <div className="stats-row stats-row--top">
        <div className="stats-user-card fitbit-card">
          <div className="stats-user-grid">
            {userStatsRows.map((item, i) => (
              <div key={i} className="stats-user-item">
                <div className="stats-user-icon"><i className={`bi ${item.icon}`} /></div>
                <span className="stats-user-label">{item.label}</span>
                <span className="stats-user-value">{item.value}</span>
              </div>
            ))}
          </div>

          <div className="stats-user-report">
            <button
               type="button"
               className="btn btn-fitbit w-100"
               style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', fontSize: '0.95rem' }}
               onClick={() => setShowReportModal(true)}
            >
               <span>Xem báo cáo chi tiết Năng lượng & Dinh dưỡng</span>
               <i className="bi bi-journal-text" style={{ fontSize: '1.3rem' }}></i>
            </button>
          </div>
        </div>

        <div className="stats-muscle-card fitbit-card">
          <div className="stats-muscle-header">
            <h2 className="stats-muscle-title">Muscle Map</h2>
            <div className="stats-muscle-toggle" role="group" aria-label="Góc nhìn">
              <button
                type="button"
                className={`stats-toggle-btn ${muscleMapView === 'anterior' ? 'stats-toggle-btn--active' : ''}`}
                onClick={() => setMuscleMapView('anterior')}
              >
                Mặt trước
              </button>
              <button
                type="button"
                className={`stats-toggle-btn ${muscleMapView === 'posterior' ? 'stats-toggle-btn--active' : ''}`}
                onClick={() => setMuscleMapView('posterior')}
              >
                Mặt sau
              </button>
            </div>
          </div>
          <div className="stats-muscle-image-wrap" style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
            <MuscleMapErrorBoundary>
              {(() => {
                // Xử lý an toàn cho Vite ESM vs CJS interop
                const SafeModel = Model.default || Model;
                if (!SafeModel || (typeof SafeModel !== 'function' && typeof SafeModel !== 'object')) {
                  return <p style={{ color: 'var(--fitbit-muted)' }}>Đang tải mô hình 3D...</p>;
                }
                return (
                  <SafeModel
                    data={bodyHighlighterData}
                    style={{ width: '40%', minWidth: '150px' }}
                    type={muscleMapView}
                    highlightedColors={['#374151', '#f87171', '#ef4444', '#dc2626', '#991b1b']}
                  />
                );
              })()}
            </MuscleMapErrorBoundary>
          </div>
          <div className="stats-muscle-focus">
            <i className="bi bi-bullseye me-1" />
            <span>Nhóm cơ trọng tâm: {focusGroupLabel}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div className="stats-chart-card fitbit-card" style={{ height: '100%', minHeight: '340px' }}>
          <div className="stats-chart-header">
            <h2 className="stats-chart-title">Năng Lượng Tiêu Hao (Đốt cháy)</h2>
            <div className="stats-period-tabs">
              <button type="button" className={`stats-period-btn ${chartPeriod === 'week' ? 'stats-period-btn--active' : ''}`} onClick={() => setChartPeriod('week')}>Tuần</button>
              <button type="button" className={`stats-period-btn ${chartPeriod === 'month' ? 'stats-period-btn--active' : ''}`} onClick={() => setChartPeriod('month')}>Tháng</button>
            </div>
          </div>
          <p className="stats-chart-sub">Lượng Calo tập luyện đã đốt (kcal) trong {chartPeriod === 'week' ? '7' : '30'} ngày qua</p>
          <div className="stats-chart-container stats-chart-container--line">
            <canvas ref={bodyCompRef} />
          </div>
        </div>
        
        <div className="stats-chart-card fitbit-card" style={{ height: '100%', minHeight: '340px' }}>
          <div className="stats-chart-header">
            <h2 className="stats-chart-title">Lượng Calories Nạp Vào</h2>
          </div>
          <p className="stats-chart-sub">Dinh dưỡng đã ăn (kcal) so với Mục tiêu TDEE ({targetCals} kcal)</p>
          <div className="stats-chart-container stats-chart-container--line">
            <canvas ref={intakeRef} />
          </div>
        </div>
      </div>

      <div className="stats-row stats-row--charts">
        <div className="stats-chart-card fitbit-card">
          <div className="stats-chart-header">
            <h2 className="stats-chart-title">Giấc ngủ tuần này</h2>
          </div>
          <p className="stats-chart-sub">Số giờ ngủ mỗi ngày — đường kẻ: mục tiêu {targetSleepMins / 60}h</p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
            {[['#22c55e','Đủ giấc'],['#60a5fa','Thừa ít'],['#1d4ed8','Thừa nhiều'],['#fca5a5','Thiếu ít'],['#ef4444','Thiếu nhiều']].map(([c,l]) => (
              <span key={l} style={{ display:'flex', alignItems:'center', gap:'5px', fontSize:'0.7rem', color:'var(--fitbit-muted)' }}>
                <span style={{ width:10, height:10, borderRadius:2, background:c, display:'inline-block' }} />{l}
              </span>
            ))}
          </div>
          <div className="stats-chart-container stats-chart-container--bar">
            <canvas ref={sleepChartRef} />
          </div>
        </div>
        <div className="stats-chart-card fitbit-card stats-chart-card--proportions">
          <div className="stats-chart-header">
            <h2 className="stats-chart-title">Tỷ lệ Dinh dưỡng (Macros)</h2>
          </div>
          <p className="stats-chart-sub">Protein, Carbs, Fat tiêu thụ (gram)</p>
          <div className="stats-chart-container stats-chart-container--doughnut">
            <canvas ref={proportionsRef} />
          </div>
        </div>
      </div>

      {weightHistoryLog.length > 0 && (
        <div className="stats-row mb-4">
          <div className="stats-chart-card fitbit-card w-100">
            <div className="stats-chart-header">
              <h2 className="stats-chart-title">Tiến độ Cân nặng</h2>
            </div>
            <p className="stats-chart-sub">Sự thay đổi cân nặng theo thời gian</p>
            <div className="stats-chart-container stats-chart-container--line">
              <canvas ref={weightChartRef} />
            </div>
          </div>
        </div>
      )}

      {weightUpdateOpen && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1050 }} tabIndex="-1" onClick={(e) => { if (e.target.classList.contains('modal')) setWeightUpdateOpen(false); }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content card-dark border-secondary shadow-lg">
              <div className="modal-header border-secondary">
                <h5 className="modal-title text-fitbit-teal"><i className="bi bi-speedometer2 me-2" /> Cập nhật Cân nặng</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setWeightUpdateOpen(false)} />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label text-muted small">Cân nặng hôm nay (kg)</label>
                  <input type="number" className="form-control bg-dark text-light border-secondary" value={newWeight} onChange={e => setNewWeight(e.target.value)} autoFocus />
                </div>
                <button type="button" className="btn btn-fitbit w-100" onClick={handleSaveWeight}>Lưu cân nặng</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {plannerOpen && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1050 }} tabIndex="-1" onClick={(e) => { if (e.target.classList.contains('modal')) setPlannerOpen(false); }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content card-dark border-secondary shadow-lg">
              <div className="modal-header border-secondary">
                <h5 className="modal-title text-fitbit-teal"><i className="bi bi-gem me-2" /> Lộ Trình Thông Minh</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setPlannerOpen(false)} />
              </div>
              <div className="modal-body">
                <div className="row g-3 mb-4">
                  <div className="col-6">
                    <label className="form-label text-muted small">Cân nặng hiện tại (kg)</label>
                    <input type="number" className="form-control bg-dark text-light border-secondary" value={goalParams.currentWeight} onChange={e => setGoalParams({ ...goalParams, currentWeight: Number(e.target.value) })} />
                  </div>
                  <div className="col-6">
                    <label className="form-label text-muted small">Cân mục tiêu (kg)</label>
                    <input type="number" className="form-control bg-dark text-light border-secondary" value={goalParams.targetWeight} onChange={e => setGoalParams({ ...goalParams, targetWeight: Number(e.target.value) })} />
                  </div>
                  <div className="col-12">
                    <label className="form-label text-muted small">Thời gian dự kiến (Số tuần)</label>
                    <input type="number" className="form-control bg-dark text-light border-secondary" value={goalParams.durationWeeks} min="1" onChange={e => setGoalParams({ ...goalParams, durationWeeks: Number(e.target.value) })} />
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-outline-fitbit w-100 mb-3"
                  onClick={calculateSmartGoal}
                  disabled={plannerBusy}
                >
                  {plannerBusy ? 'Đang phân tích...' : 'Phân tích Lộ trình'}
                </button>
                {plannerError && (
                  <div className="alert alert-danger bg-danger text-white border-0 py-2 px-3 small">
                    <i className="bi bi-exclamation-triangle-fill me-2" />{plannerError}
                  </div>
                )}
                {plannerResult && !plannerError && (
                  <div className="p-3 bg-dark rounded border border-secondary" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
                    {/* Chỉ tiêu ngày */}
                    <h6 className="text-light mb-3 border-bottom border-secondary pb-2">
                      <i className="bi bi-calculator me-2 text-fitbit-teal" />Chỉ tiêu mỗi ngày tập
                    </h6>
                    <div className="row g-2 mb-3">
                      <div className="col-6">
                        <div className="p-2 rounded" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' }}>
                          <small className="text-muted d-block">🔥 Calo cần đốt</small>
                          <strong className="text-danger">{plannerResult.dailyDeficit} kcal</strong>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="p-2 rounded" style={{ background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.3)' }}>
                          <small className="text-muted d-block">🍎 Calo được nạp</small>
                          <strong className="text-warning">{plannerResult.dailyIntake} kcal</strong>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="p-2 rounded" style={{ background: 'rgba(0,176,185,0.12)', border: '1px solid rgba(0,176,185,0.3)' }}>
                          <small className="text-muted d-block">📅 Lịch tập</small>
                          <strong className="text-fitbit-teal">{plannerResult.freq}</strong>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="p-2 rounded" style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)' }}>
                          <small className="text-muted d-block">💧 Nước / ngày</small>
                          <strong className="text-info">{plannerResult.water} L</strong>
                        </div>
                      </div>
                    </div>

                    {/* Danh sách bài tập */}
                    <h6 className="text-light mb-2 border-bottom border-secondary pb-2">
                      <i className="bi bi-list-check me-2 text-fitbit-teal" />Lộ trình bài tập / buổi
                    </h6>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ color: 'var(--fitbit-teal)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                          <th style={{ padding: '6px 8px', textAlign: 'left' }}>Nhóm cơ</th>
                          <th style={{ padding: '6px 8px', textAlign: 'left' }}>Bài tập</th>
                          <th style={{ padding: '6px 8px', textAlign: 'center' }}>Sets</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right' }}>~Calo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {plannerResult.exercises.map((item, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '6px 8px', color: '#00B0B9', whiteSpace: 'nowrap' }}>
                              {item.exercise.muscleGroup}
                            </td>
                            <td style={{ padding: '6px 8px', color: '#e5e7eb' }}>{item.exercise.name}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'center', color: '#f97316' }}>{item.sets}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', color: '#f43f5e' }}>{item.cal} kcal</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Tổng kết */}
                    <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top border-secondary">
                      <span className="text-muted small">Tổng đốt / buổi:</span>
                      <strong style={{ color: plannerResult.totalBurn >= plannerResult.dailyDeficit ? '#10b981' : '#f43f5e' }}>
                        {plannerResult.totalBurn} / {plannerResult.dailyDeficit} kcal
                        {plannerResult.totalBurn >= plannerResult.dailyDeficit
                          ? ' ✅ Đạt chỉ tiêu!'
                          : ' ⚠️ Chưa đủ'}
                      </strong>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer border-secondary">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setPlannerOpen(false)}>Hủy</button>
                <button type="button" className="btn btn-fitbit" onClick={handleSaveSmartGoal} disabled={!!plannerError || !plannerResult}>Lưu mục tiêu</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showReportModal && (
        <div className="coach-modal-overlay" style={{ zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={() => setShowReportModal(false)}>
          <div className="coach-modal" style={{ width: '90%', maxWidth: '600px', background: 'var(--fitbit-card)', borderRadius: '16px', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: 'var(--fitbit-teal)' }}><i className="bi bi-journal-text me-2"></i>Báo cáo tiến độ</h3>
              <button type="button" onClick={() => setShowReportModal(false)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>
                <i className="bi bi-x" />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.95rem', lineHeight: 1.6, color: '#fff' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h4 style={{ color: 'var(--fitbit-teal)', fontSize: '1.05rem', margin: '0 0 8px 0' }}><i className="bi bi-fire me-2"></i>Năng lượng đốt cháy</h4>
                <p style={{ margin: 0 }}>
                  {periodLabel}, bạn đốt trung bình <strong>{avgBurn} kcal/ngày</strong> ({burnAchievedDays}/{safeDaysCount} ngày bám mục tiêu).<br/>
                  {avgTargetBurn != null ? (
                    avgBurn >= avgTargetBurn ? <span style={{color: '#22c55e'}}>✓ Bạn đang bám mục tiêu đốt.</span> : <span style={{color: '#f97316'}}>! Bạn chưa đạt mục tiêu đốt.</span>
                  ) : null}<br/>
                  Cao nhất vào <strong>{chartLabels[bestBurnIdx]}</strong>, thấp nhất vào <strong>{chartLabels[worstBurnIdx]}</strong>.
                </p>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h4 style={{ color: 'var(--fitbit-teal)', fontSize: '1.05rem', margin: '0 0 8px 0' }}><i className="bi bi-egg-fried me-2"></i>Dinh dưỡng nạp vào</h4>
                <p style={{ margin: 0 }}>
                  Trung bình <strong>{avgIntake} kcal/ngày</strong>. Có <strong>{withinIntakeRangeDays}/{safeDaysCount}</strong> ngày nạp sát hạn mức (±100 kcal).<br/>
                  <strong>{overDays}</strong> ngày vượt hạn mức, <strong>{underDays}</strong> ngày thiếu.<br/>
                  Gần mục tiêu nhất vào: <strong>{chartLabels[bestIntakeIdx]}</strong>.
                </p>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h4 style={{ color: '#eab308', fontSize: '1.05rem', margin: '0 0 8px 0' }}><i className="bi bi-pie-chart me-2"></i>Cân bằng Đa lượng (Macros)</h4>
                <p style={{ margin: 0 }}>
                  Protein {proteinPct}%, Carbs {carbsPct}%, Fat {fatPct}% (tính theo kcal).<br/>
                  <span style={{ color: 'var(--fitbit-muted)' }}>
                    {proteinPct < 35
                      ? 'Đạm đang hơi thấp—tăng protein để cơ bắp phục hồi tốt hơn.'
                      : proteinPct > 50
                        ? 'Đạm khá cao—hãy giữ mức cân đối để tối ưu năng lượng.'
                        : 'Lượng đạm ở mức ổn định—tiếp tục phát huy.'}
                  </span>
                </p>
              </div>

              <div style={{ background: 'rgba(0,176,185,0.1)', padding: '16px', borderRadius: '12px', border: '1px solid var(--fitbit-teal)' }}>
                <h4 style={{ color: 'var(--fitbit-teal)', fontSize: '1.05rem', margin: '0 0 8px 0' }}><i className="bi bi-bullseye me-2"></i>Tiến độ tổng thể</h4>
                <p style={{ margin: 0 }}>
                  Bạn có <strong>{overallCompletionPct}%</strong> số ngày đạt ĐỒNG THỜI cả hai mục tiêu năng lượng (đốt đủ và ăn sát chuẩn).
                </p>
              </div>
            </div>

            <button className="btn btn-fitbit w-100 mt-4" onClick={() => setShowReportModal(false)}>Đóng</button>
          </div>
        </div>
      )}

    </div>
  );
}

export default Stats;

