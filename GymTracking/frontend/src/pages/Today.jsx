import { useState } from 'react';

const WATER_GOAL_ML = 2000;
const TARGET_CALORIES = 1796;

function Today() {
  const [waterMl, setWaterMl] = useState(1250);
  const [consumedCalories, setConsumedCalories] = useState(850);
  const remainingCalories = TARGET_CALORIES - consumedCalories;

  const addWater = () => setWaterMl((prev) => prev + 250);

  return (
    <div className="today-sections">
      <section className="today-section">
        <h2 className="today-section-title">Sleep</h2>
        <div className="today-cards">
          <div className="fitbit-card">
            <div className="fitbit-card-body">
              <p className="fitbit-card-title">Sleep duration</p>
              <p className="fitbit-card-value">No data</p>
              <p className="fitbit-card-sub">Today</p>
            </div>
            <div className="fitbit-card-icon purple"><i className="bi bi-moon-stars" /></div>
          </div>
        </div>
      </section>

      <section className="today-section">
        <h2 className="today-section-title">Nutrition</h2>
        <div className="today-cards">
          <div className="fitbit-card">
            <div className="fitbit-card-body">
              <p className="fitbit-card-title">Food</p>
              <p className="fitbit-card-value">{consumedCalories} cal</p>
              <p className="fitbit-card-sub">Today · {remainingCalories > 0 ? remainingCalories : 0} remaining</p>
            </div>
            <div className="fitbit-card-icon"><i className="bi bi-apple" /></div>
          </div>
          <div className="fitbit-card">
            <div className="fitbit-card-body">
              <p className="fitbit-card-title">Water</p>
              <p className="fitbit-card-value">{waterMl} ml</p>
              <p className="fitbit-card-sub">Today</p>
            </div>
            <button type="button" className="fitbit-card-icon blue" onClick={addWater} title="Thêm nước">
              <i className="bi bi-droplet-half" />
            </button>
          </div>
        </div>
      </section>

      <section className="today-section">
        <h2 className="today-section-title">Activity</h2>
        <div className="today-cards">
          <div className="fitbit-card">
            <div className="fitbit-card-body">
              <p className="fitbit-card-title">Exercise days</p>
              <p className="fitbit-card-value">0 of 5</p>
              <p className="fitbit-card-sub">This week</p>
              <div className="exercise-bars" style={{ marginTop: '10px' }}>
                {[...Array(7)].map((_, i) => <span key={i} />)}
              </div>
              <div className="exercise-days-labels">
                <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
              </div>
            </div>
          </div>
          <div className="fitbit-card">
            <div className="fitbit-card-body">
              <p className="fitbit-card-title">Energy burned</p>
              <p className="fitbit-card-value">1,450 cal</p>
              <p className="fitbit-card-sub">Today</p>
            </div>
            <div className="energy-ring-wrap" style={{ '--energy-pct': 72 }}>
              <div className="energy-ring-inner"><i className="bi bi-fire" /></div>
            </div>
          </div>
        </div>
      </section>

      <section className="today-section">
        <h2 className="today-section-title">Health</h2>
        <div className="today-cards">
          <div className="fitbit-card">
            <div className="fitbit-card-body">
              <p className="fitbit-card-title">Weight</p>
              <p className="fitbit-card-value">60 kg</p>
              <p className="fitbit-card-sub">Today</p>
            </div>
            <div className="fitbit-card-icon"><i className="bi bi-speedometer2" /></div>
          </div>
          <div className="fitbit-card get-started">
            <div className="fitbit-card-body">
              <p className="fitbit-card-title">Glucose</p>
              <p className="fitbit-card-value">Get started</p>
              <p className="fitbit-card-sub">Tap to set up</p>
            </div>
            <div className="fitbit-card-icon blue"><i className="bi bi-droplet" /></div>
          </div>
          <div className="fitbit-card get-started">
            <div className="fitbit-card-body">
              <p className="fitbit-card-title">Mindful days</p>
              <p className="fitbit-card-value">Get started</p>
              <p className="fitbit-card-sub">Tap to set up</p>
            </div>
            <div className="fitbit-card-icon purple"><i className="bi bi-brain" /></div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Today;
