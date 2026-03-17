import { useState, useRef, useEffect } from 'react';

const COPIES = 3;

const FILTERS = [
  { id: 'all', label: 'Tất cả', icon: 'bi bi-grid-3x3-gap' },
  { id: 'running', label: 'Chạy bộ', icon: 'bi bi-person-running' },
  { id: 'strength', label: 'Sức mạnh', icon: 'bi bi-dumbbell' },
  { id: 'mindful', label: 'Chánh niệm', icon: 'bi bi-brain' },
  { id: 'cardio', label: 'Cardio', icon: 'bi bi-heart-pulse' },
  { id: 'yoga', label: 'Yoga', icon: 'bi bi-flower2' },
  { id: 'mobility', label: 'Mobility & recovery', icon: 'bi bi-arrow-repeat' },
  { id: 'recipes', label: 'Recipes', icon: 'bi bi-egg-fried' },
  { id: 'new', label: 'New', icon: 'bi bi-stars' },
  { id: 'available', label: 'Available to you', icon: 'bi bi-unlock' },
  { id: 'favorites', label: 'Favorites', icon: 'bi bi-heart-fill' },
];

const PELOTON_ITEMS = [
  { title: 'Peloton: Evening Mobility with Kirra Michel', duration: '20 min', type: 'Workout', category: 'mobility', image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=240&fit=crop' },
  { title: 'Peloton Adrian Williams: HIIT', duration: '10 min', type: 'Workout', category: 'cardio', image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&h=240&fit=crop' },
  { title: 'Peloton: Morning Stretch', duration: '15 min', type: 'Stretch', category: 'mobility', image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=240&fit=crop' },
  { title: 'Peloton: Tread Bootcamp', duration: '30 min', type: 'Workout', category: 'running', image: 'https://images.unsplash.com/photo-1534258936925-c58bed479fcb?w=400&h=240&fit=crop' },
  { title: 'Peloton: Upper Body Strength', duration: '25 min', type: 'Workout', category: 'strength', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=240&fit=crop' },
  { title: 'Peloton: Power Yoga Flow', duration: '45 min', type: 'Yoga', category: 'yoga', image: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=400&h=240&fit=crop' },
  { title: 'Peloton: Tabata Ride', duration: '20 min', type: 'Workout', category: 'cardio', image: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400&h=240&fit=crop' },
  { title: 'Peloton: Foam Rolling Recovery', duration: '10 min', type: 'Recovery', category: 'mobility', image: 'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?w=400&h=240&fit=crop' },
];

const SLEEP_ITEMS = [
  { title: 'Relax from head to toe', duration: '22 min', type: 'Mindfulness', category: 'mindful', image: 'https://images.unsplash.com/photo-1541783245831-57d6fb0926d3?w=400&h=240&fit=crop' },
  { title: 'Comfort sounds for sleep', duration: '5 min', type: 'Mindfulness', category: 'mindful', image: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=400&h=240&fit=crop' },
  { title: 'Deep sleep meditation', duration: '30 min', type: 'Mindfulness', category: 'mindful', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=240&fit=crop' },
  { title: 'Wind down yoga', duration: '15 min', type: 'Yoga', category: 'mindful', image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=240&fit=crop' },
  { title: 'Rain & thunder sounds', duration: '45 min', type: 'Mindfulness', category: 'mindful', image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&h=240&fit=crop' },
  { title: 'Body scan for sleep', duration: '20 min', type: 'Mindfulness', category: 'mindful', image: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=400&h=240&fit=crop' },
];

const STRESS_ITEMS = [
  { title: 'How to calm down', duration: '5 min', type: 'Mindfulness', category: 'mindful', image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&h=240&fit=crop' },
  { title: '2-minute breathing', duration: '2 min', type: 'Mindfulness', category: 'mindful', image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=240&fit=crop' },
  { title: 'Quick stress relief', duration: '10 min', type: 'Mindfulness', category: 'mindful', image: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=400&h=240&fit=crop' },
  { title: 'Anxiety relief meditation', duration: '12 min', type: 'Mindfulness', category: 'mindful', image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&h=240&fit=crop' },
  { title: 'Office stretch break', duration: '7 min', type: 'Stretch', category: 'mindful', image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=240&fit=crop' },
  { title: 'Evening gratitude', duration: '8 min', type: 'Mindfulness', category: 'mindful', image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400&h=240&fit=crop' },
];

const FITNESS_ITEMS = [
  { title: 'Wheelchair med ball cardio', duration: '18 min', type: 'Workout', category: 'cardio', image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&h=240&fit=crop' },
  { title: 'Peloton: Full body strength', duration: '20 min', type: 'Workout', category: 'strength', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=240&fit=crop' },
  { title: 'Yoga for beginners', duration: '25 min', type: 'Yoga', category: 'yoga', image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=240&fit=crop' },
  { title: '5K run training', duration: '35 min', type: 'Workout', category: 'running', image: 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=400&h=240&fit=crop' },
  { title: 'Lower body strength', duration: '28 min', type: 'Workout', category: 'strength', image: 'https://images.unsplash.com/photo-1434682881908-b43d0467b798?w=400&h=240&fit=crop' },
  { title: 'HIIT cardio blast', duration: '15 min', type: 'Workout', category: 'cardio', image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&h=240&fit=crop' },
  { title: 'Vinyasa flow', duration: '40 min', type: 'Yoga', category: 'yoga', image: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=400&h=240&fit=crop' },
  { title: 'Pilates core', duration: '22 min', type: 'Pilates', category: 'strength', image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&h=240&fit=crop' },
  { title: 'Mobility & flexibility', duration: '20 min', type: 'Recovery', category: 'mobility', image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=240&fit=crop' },
  { title: 'Treadmill intervals', duration: '25 min', type: 'Workout', category: 'running', image: 'https://images.unsplash.com/photo-1534258936925-c58bed479fcb?w=400&h=240&fit=crop' },
  { title: 'Dumbbell upper body', duration: '30 min', type: 'Workout', category: 'strength', image: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&h=240&fit=crop' },
  { title: 'Restorative yoga', duration: '30 min', type: 'Yoga', category: 'yoga', image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=240&fit=crop' },
];

const INSTRUCTORS = [
  { name: 'Denise', role: 'Fitness Instructor', image: 'https://images.unsplash.com/photo-1594381898411-846e7d193883?w=200&h=200&fit=crop&crop=face' },
  { name: 'Diamond', role: 'Fitness Instructor', image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=200&fit=crop&crop=face' },
  { name: 'Alex', role: 'Yoga Instructor', image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=200&h=200&fit=crop&crop=face' },
  { name: 'Jordan', role: 'Strength Coach', image: 'https://thumbs.dreamstime.com/b/confident-motivated-fitness-coach-posing-gym-105270802.jpg' },
  { name: 'Kirra', role: 'Peloton Instructor', image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=200&h=200&fit=crop&crop=face' },
  { name: 'Marcus', role: 'HIIT Coach', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&h=200&fit=crop&crop=face' },
  { name: 'Sofia', role: 'Pilates Instructor', image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=200&h=200&fit=crop&crop=face' },
  { name: 'Ryan', role: 'Running Coach', image: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=200&h=200&fit=crop&crop=face' },
  { name: 'Emma', role: 'Mindfulness Coach', image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face' },
  { name: 'David', role: 'CrossFit Trainer', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face' },
  { name: 'Luna', role: 'Dance Fitness', image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=face' },
  { name: 'Chris', role: 'Mobility Specialist', image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face' },
];

const BRANDS = [
  { name: 'AURA', icon: 'bi bi-circle' },
  { name: 'Breethe', icon: 'bi bi-flower1' },
  { name: 'Peloton', icon: 'bi bi-play-circle' },
  { name: 'Calm', icon: 'bi bi-moon-stars' },
  { name: 'Headspace', icon: 'bi bi-headphones' },
  { name: 'Apple Fitness+', icon: 'bi bi-apple' },
  { name: 'Nike Training', icon: 'bi bi-lightning' },
  { name: 'Adidas Runtastic', icon: 'bi bi-geo-alt' },
  { name: 'Strava', icon: 'bi bi-speedometer2' },
  { name: 'MyFitnessPal', icon: 'bi bi-egg-fried' },
  { name: 'Fitbit', icon: 'bi bi-heart-pulse' },
  { name: 'Garmin', icon: 'bi bi-watch' },
  { name: 'Whoop', icon: 'bi bi-activity' },
  { name: 'Zwift', icon: 'bi bi-bicycle' },
];

function CoachSection({ title, children }) {
  return (
    <section className="coach-section">
      <div className="coach-section-header">
        <h2 className="coach-section-title">{title}</h2>
        <button type="button" className="coach-see-all">Xem tất cả</button>
      </div>
      <div className="coach-card-row">{children}</div>
    </section>
  );
}

function filterItems(items, filterId, query) {
  if (!items || !items.length) return [];
  let out = items;
  if (filterId && filterId !== 'all') {
    out = out.filter((item) => item.category === filterId);
  }
  if (query && query.trim()) {
    const q = query.trim().toLowerCase();
    out = out.filter((item) => item.title.toLowerCase().includes(q));
  }
  return out;
}

function CoachCard({ item }) {
  return (
    <div className="coach-card">
      <div className="coach-card-image-wrap">
        <img src={item.image} alt="" className="coach-card-image" />
        <span className="coach-card-play"><i className="bi bi-play-fill" /></span>
      </div>
      <h3 className="coach-card-title">{item.title}</h3>
      <p className="coach-card-meta">
        <i className="bi bi-headphones me-1" />
        {item.duration} · {item.type}
      </p>
    </div>
  );
}

function Coach() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [seeAllModal, setSeeAllModal] = useState(null);
  const instructorsCarouselRef = useRef(null);
  const brandsCarouselRef = useRef(null);
  const instructorsJumpingRef = useRef(false);
  const brandsJumpingRef = useRef(false);

  const carouselNext = (ref) => {
    if (ref?.current) ref.current.scrollBy({ left: ref.current.clientWidth, behavior: 'smooth' });
  };
  const carouselPrev = (ref) => {
    if (ref?.current) ref.current.scrollBy({ left: -ref.current.clientWidth, behavior: 'smooth' });
  };

  const setupInfiniteScroll = (elRef, jumpRef) => {
    const el = elRef?.current;
    if (!el) return;
    const total = el.scrollWidth;
    const oneCopy = total / COPIES;
    if (oneCopy <= 0) return;
    const onScroll = () => {
      if (jumpRef.current) {
        jumpRef.current = false;
        return;
      }
      const left = el.scrollLeft;
      if (left >= oneCopy * 2) {
        jumpRef.current = true;
        el.scrollLeft = left - oneCopy;
      } else if (left <= 0) {
        jumpRef.current = true;
        el.scrollLeft = left + oneCopy;
      }
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  };

  useEffect(() => {
    const el = instructorsCarouselRef.current;
    if (!el) return;
    const init = () => {
      const oneCopy = el.scrollWidth / COPIES;
      if (oneCopy <= 0) return;
      instructorsJumpingRef.current = true;
      el.scrollLeft = oneCopy;
      instructorsJumpingRef.current = false;
    };
    init();
    const raf = requestAnimationFrame(init);
    const cleanup = setupInfiniteScroll(instructorsCarouselRef, instructorsJumpingRef);
    return () => {
      cancelAnimationFrame(raf);
      if (cleanup) cleanup();
    };
  }, [INSTRUCTORS.length]);

  useEffect(() => {
    const el = brandsCarouselRef.current;
    if (!el) return;
    const init = () => {
      const oneCopy = el.scrollWidth / COPIES;
      if (oneCopy <= 0) return;
      brandsJumpingRef.current = true;
      el.scrollLeft = oneCopy;
      brandsJumpingRef.current = false;
    };
    init();
    const raf = requestAnimationFrame(init);
    const cleanup = setupInfiniteScroll(brandsCarouselRef, brandsJumpingRef);
    return () => {
      cancelAnimationFrame(raf);
      if (cleanup) cleanup();
    };
  }, [BRANDS.length]);

  const pelotonFiltered = filterItems(PELOTON_ITEMS, activeFilter, searchQuery);
  const sleepFiltered = filterItems(SLEEP_ITEMS, activeFilter, searchQuery);
  const stressFiltered = filterItems(STRESS_ITEMS, activeFilter, searchQuery);
  const fitnessFiltered = filterItems(FITNESS_ITEMS, activeFilter, searchQuery);

  return (
    <div className="coach-page">
      <div className="coach-filters">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`coach-pill ${activeFilter === f.id ? 'coach-pill--active' : ''}`}
            onClick={() => setActiveFilter(f.id)}
          >
            <i className={`bi ${f.icon} me-2`} />
            {f.label}
          </button>
        ))}
      </div>

      <div className="coach-search-wrap">
        <i className="bi bi-search coach-search-icon" />
        <input
          type="text"
          className="coach-search-input"
          placeholder="Tìm lớp, chủ đề..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {pelotonFiltered.length > 0 && (
        <CoachSection title="Lớp Peloton">
          {pelotonFiltered.map((item, i) => (
            <CoachCard key={item.title + i} item={item} />
          ))}
        </CoachSection>
      )}

      {sleepFiltered.length > 0 && (
        <CoachSection title="Ngủ ngon hơn">
          {sleepFiltered.map((item, i) => (
            <CoachCard key={item.title + i} item={item} />
          ))}
        </CoachSection>
      )}

      {stressFiltered.length > 0 && (
        <CoachSection title="Giảm căng thẳng">
          {stressFiltered.map((item, i) => (
            <CoachCard key={item.title + i} item={item} />
          ))}
        </CoachSection>
      )}

      {fitnessFiltered.length > 0 && (
        <CoachSection title="Tìm phong cách tập">
          {fitnessFiltered.map((item, i) => (
            <CoachCard key={item.title + i} item={item} />
          ))}
        </CoachSection>
      )}

      <section className="coach-section">
        <div className="coach-section-header">
          <h2 className="coach-section-title">Huấn luyện viên</h2>
          <button type="button" className="coach-see-all" onClick={() => setSeeAllModal('instructors')}>Xem tất cả</button>
        </div>
        <div className="coach-carousel-wrap">
          <button type="button" className="coach-carousel-btn coach-carousel-btn--prev" onClick={() => carouselPrev(instructorsCarouselRef)} aria-label="Trước">
            <i className="bi bi-chevron-left" />
          </button>
          <div ref={instructorsCarouselRef} className="coach-instructor-row coach-carousel-track">
            {Array.from({ length: COPIES }, (_, copy) =>
              INSTRUCTORS.map((inst, i) => (
                <div key={`inst-${copy}-${i}`} className="coach-instructor-card">
                  <div className="coach-instructor-avatar-wrap">
                    <img src={inst.image} alt="" className="coach-instructor-avatar" />
                  </div>
                  <p className="coach-instructor-name">{inst.name}</p>
                  <p className="coach-instructor-role">{inst.role}</p>
                </div>
              ))
            )}
          </div>
          <button type="button" className="coach-carousel-btn coach-carousel-btn--next" onClick={() => carouselNext(instructorsCarouselRef)} aria-label="Sau">
            <i className="bi bi-chevron-right" />
          </button>
        </div>
      </section>

      <section className="coach-section">
        <div className="coach-section-header">
          <h2 className="coach-section-title">Thương hiệu</h2>
          <button type="button" className="coach-see-all" onClick={() => setSeeAllModal('brands')}>Xem tất cả</button>
        </div>
        <div className="coach-carousel-wrap">
          <button type="button" className="coach-carousel-btn coach-carousel-btn--prev" onClick={() => carouselPrev(brandsCarouselRef)} aria-label="Trước">
            <i className="bi bi-chevron-left" />
          </button>
          <div ref={brandsCarouselRef} className="coach-brand-row coach-carousel-track">
            {Array.from({ length: COPIES }, (_, copy) =>
              BRANDS.map((b, i) => (
                <button key={`brand-${copy}-${i}`} type="button" className="coach-brand-card">
                  <i className={`bi ${b.icon} coach-brand-icon`} />
                  <span className="coach-brand-name">{b.name}</span>
                </button>
              ))
            )}
          </div>
          <button type="button" className="coach-carousel-btn coach-carousel-btn--next" onClick={() => carouselNext(brandsCarouselRef)} aria-label="Sau">
            <i className="bi bi-chevron-right" />
          </button>
        </div>
      </section>

      {seeAllModal && (
        <div className="coach-modal-overlay" onClick={() => setSeeAllModal(null)} role="presentation">
          <div className="coach-modal" onClick={(e) => e.stopPropagation()}>
            <div className="coach-modal-header">
              <h3 className="coach-modal-title">{seeAllModal === 'instructors' ? 'Huấn luyện viên' : 'Thương hiệu'}</h3>
              <button type="button" className="coach-modal-close" onClick={() => setSeeAllModal(null)} aria-label="Đóng">
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <div className="coach-modal-body">
              {seeAllModal === 'instructors' && (
                <div className="coach-modal-instructors">
                  {INSTRUCTORS.map((inst, i) => (
                    <div key={i} className="coach-instructor-card">
                      <div className="coach-instructor-avatar-wrap">
                        <img src={inst.image} alt="" className="coach-instructor-avatar" />
                      </div>
                      <p className="coach-instructor-name">{inst.name}</p>
                      <p className="coach-instructor-role">{inst.role}</p>
                    </div>
                  ))}
                </div>
              )}
              {seeAllModal === 'brands' && (
                <div className="coach-modal-brands">
                  {BRANDS.map((b, i) => (
                    <button key={i} type="button" className="coach-brand-card">
                      <i className={`bi ${b.icon} coach-brand-icon`} />
                      <span className="coach-brand-name">{b.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Coach;
