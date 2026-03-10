import { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';

const CHART_COLORS = {
  teal: '#00B0B9',
  tealLight: 'rgba(0, 176, 185, 0.25)',
  muted: '#9ca3af',
  doughnut: ['#00B0B9', '#6b7280', '#4b5563', '#374151'],
};

const USER_STATS = {
  name: 'User',
  bmi: 22.7,
  height: 160,
  weight: 58,
  targetWeight: 55,
  targetBmi: 21.5,
};

const BODY_COMP_DATA = {
  labels: ['Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7'],
  values: [85, 82, 79, 77, 76, 75],
};

const WORKOUT_WEEK = [1, 1, 0, 1, 1, 1, 0];

const PROPORTIONS = [
  { label: 'Mỡ', value: 25, color: CHART_COLORS.doughnut[0] },
  { label: 'Cơ', value: 45, color: CHART_COLORS.doughnut[1] },
  { label: 'Nước', value: 25, color: CHART_COLORS.doughnut[2] },
  { label: 'Xương', value: 5, color: CHART_COLORS.doughnut[3] },
];

function Stats() {
  const [muscleMapGender, setMuscleMapGender] = useState('female');
  const [chartPeriod, setChartPeriod] = useState('month');
  const bodyCompRef = useRef(null);
  const workoutChartRef = useRef(null);
  const proportionsRef = useRef(null);

  useEffect(() => {
    if (!bodyCompRef.current) return;
    const ctx = bodyCompRef.current.getContext('2d');
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: BODY_COMP_DATA.labels,
        datasets: [{
          label: 'Vòng eo (cm)',
          data: BODY_COMP_DATA.values,
          borderColor: CHART_COLORS.teal,
          backgroundColor: CHART_COLORS.tealLight,
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: CHART_COLORS.teal,
        }],
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
            min: 70,
            max: 90,
            grid: { color: 'rgba(255,255,255,0.06)' },
            ticks: { color: CHART_COLORS.muted, font: { size: 11 } },
          },
        },
      },
    });
    return () => chart.destroy();
  }, [chartPeriod]);

  useEffect(() => {
    if (!workoutChartRef.current) return;
    const ctx = workoutChartRef.current.getContext('2d');
    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'],
        datasets: [{
          data: WORKOUT_WEEK,
          backgroundColor: WORKOUT_WEEK.map((v) => (v ? CHART_COLORS.teal : 'rgba(255,255,255,0.08)')),
          borderRadius: 6,
          barPercentage: 0.65,
          categoryPercentage: 0.8,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(37, 38, 42, 0.95)',
            callbacks: { label: (ctx) => (ctx.raw ? 'Có tập' : 'Không tập') },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: { color: CHART_COLORS.muted, font: { size: 11 } },
          },
          y: { display: false, min: 0, max: 1 },
        },
      },
    });
    return () => chart.destroy();
  }, []);

  useEffect(() => {
    if (!proportionsRef.current) return;
    const ctx = proportionsRef.current.getContext('2d');
    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: PROPORTIONS.map((p) => p.label),
        datasets: [{
          data: PROPORTIONS.map((p) => p.value),
          backgroundColor: PROPORTIONS.map((p) => p.color),
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
            callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.raw}%` },
          },
        },
      },
    });
    return () => chart.destroy();
  }, []);

  const focusGroupLabel = muscleMapGender === 'female' ? 'Lower Body & Core' : 'Upper Body & Core';

  return (
    <div className="stats-page">
      <h1 className="stats-page-title">Thống kê tiến độ</h1>

      <div className="stats-row stats-row--top">
        <div className="stats-user-card fitbit-card">
          <div className="stats-user-grid">
            {[
              { icon: 'bi-person', label: 'Tên', value: USER_STATS.name },
              { icon: 'bi-person-badge', label: 'BMI', value: USER_STATS.bmi },
              { icon: 'bi-rulers', label: 'Chiều cao', value: `${USER_STATS.height} cm` },
              { icon: 'bi-speedometer2', label: 'Cân nặng', value: `${USER_STATS.weight} kg` },
              { icon: 'bi-bullseye', label: 'Mục tiêu cân nặng', value: `${USER_STATS.targetWeight} kg` },
              { icon: 'bi-heart-half', label: 'Mục tiêu BMI', value: USER_STATS.targetBmi },
            ].map((item, i) => (
              <div key={i} className="stats-user-item">
                <div className="stats-user-icon"><i className={`bi ${item.icon}`} /></div>
                <span className="stats-user-label">{item.label}</span>
                <span className="stats-user-value">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="stats-muscle-card fitbit-card">
          <div className="stats-muscle-header">
            <h2 className="stats-muscle-title">Muscle Map</h2>
            <div className="stats-muscle-toggle" role="group" aria-label="Giới tính">
              <button
                type="button"
                className={`stats-toggle-btn ${muscleMapGender === 'female' ? 'stats-toggle-btn--active' : ''}`}
                onClick={() => setMuscleMapGender('female')}
              >
                Nữ
              </button>
              <button
                type="button"
                className={`stats-toggle-btn ${muscleMapGender === 'male' ? 'stats-toggle-btn--active' : ''}`}
                onClick={() => setMuscleMapGender('male')}
              >
                Nam
              </button>
            </div>
          </div>
          <div className="stats-muscle-image-wrap">
            <img
              src="https://fitliferegime.com/wp-content/uploads/2025/04/Muscle-Chart-and-Exercises.png"
              className="stats-muscle-image"
              alt="Muscle Map"
            />
          </div>
          <div className="stats-muscle-focus">
            <i className="bi bi-bullseye me-1" />
            <span>Nhóm cơ trọng tâm: {focusGroupLabel}</span>
          </div>
        </div>
      </div>

      <div className="stats-row stats-row--body-comp">
        <div className="stats-chart-card fitbit-card">
          <div className="stats-chart-header">
            <h2 className="stats-chart-title">Body Composition</h2>
            <div className="stats-period-tabs">
              <button type="button" className={`stats-period-btn ${chartPeriod === 'week' ? 'stats-period-btn--active' : ''}`} onClick={() => setChartPeriod('week')}>Tuần</button>
              <button type="button" className={`stats-period-btn ${chartPeriod === 'month' ? 'stats-period-btn--active' : ''}`} onClick={() => setChartPeriod('month')}>Tháng</button>
            </div>
          </div>
          <p className="stats-chart-sub">Vòng eo (cm) theo thời gian</p>
          <div className="stats-chart-container stats-chart-container--line">
            <canvas ref={bodyCompRef} />
          </div>
        </div>
      </div>

      <div className="stats-row stats-row--charts">
        <div className="stats-chart-card fitbit-card">
          <div className="stats-chart-header">
            <h2 className="stats-chart-title">Workout</h2>
          </div>
          <p className="stats-chart-sub">Số ngày tập trong tuần</p>
          <div className="stats-chart-container stats-chart-container--bar">
            <canvas ref={workoutChartRef} />
          </div>
        </div>
        <div className="stats-chart-card fitbit-card stats-chart-card--proportions">
          <div className="stats-chart-header">
            <h2 className="stats-chart-title">Thành phần cơ thể</h2>
          </div>
          <p className="stats-chart-sub">Tỷ lệ ước tính (%)</p>
          <div className="stats-chart-container stats-chart-container--doughnut">
            <canvas ref={proportionsRef} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Stats;
