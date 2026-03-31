import { useEffect, useRef, useState } from 'react';
import dailySummaryService from '../services/dailySummaryService';
import nutritionService from '../services/nutritionService';
import { useUser } from '../context/UserContext';
import toast from 'react-hot-toast';
import { calcSmartTargets } from '../utils/smartGoalCalc';
import { sendChatMessage } from '../services/chatService';

function Nutrition() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [caloriesToday, setCaloriesToday] = useState(0);
  const [adding, setAdding] = useState(false);
  const [customMeal, setCustomMeal] = useState({ name: '', calories: '', protein: 0, carbs: 0, fat: 0 });
  const [meals, setMeals] = useState([]);
  const [foodSuggestions, setFoodSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [quickMeals, setQuickMeals] = useState([]);
  const [showCreateFood, setShowCreateFood] = useState(false);
  const [newFood, setNewFood] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '' });
  const [libraryFoods, setLibraryFoods] = useState([]);
  const [activeMealTab, setActiveMealTab] = useState('Breakfast');
  const [showAllLibrary, setShowAllLibrary] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [foodQuery, setFoodQuery] = useState('');
  const [allFoods, setAllFoods] = useState([]);
  const [allFoodsLoading, setAllFoodsLoading] = useState(true);

  // Meal plan 7 ngày (gợi ý)
  const [planBusy, setPlanBusy] = useState(false);
  const [mealPlan7d, setMealPlan7d] = useState(null);

  const [foodAiBusy, setFoodAiBusy] = useState(false);
  const [foodSaving, setFoodSaving] = useState(false);

  const getFoodImageSrc = (food) => {
    if (food?.image) return food.image;
    const cat = String(food?.category || 'Chung');
    // Dùng lock theo category để placeholder ổn định, không random theo mỗi lần render
    const lock = encodeURIComponent(`category-${cat}`);
    return `https://loremflickr.com/400/300/food?lock=${lock}`;
  };

  // History table states
  const [historyView, setHistoryView] = useState('week'); // 'week' | 'month'
  const [historyData, setHistoryData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedMonthDate, setSelectedMonthDate] = useState(new Date().toISOString().split('T')[0]);

  const FOOD_CATEGORIES = [
    '', 'Bánh, kẹo, đồ ngọt', 'Canh', 'Cháo', 'Cơm phần',
    'Đồ ăn liền', 'Đồ ăn tiện lợi', 'Đồ ăn vặt', 'Đồ uống',
    'Món mặn', 'Món sợi', 'Món trứng', 'Nước giải khát', 'Quả chín', 'Xôi'
  ];

  const rowRef = useRef(null);
  const isDown = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  const handleMouseDown = (e) => {
    isDown.current = true;
    startX.current = e.pageX - rowRef.current.offsetLeft;
    scrollLeft.current = rowRef.current.scrollLeft;
  };
  const handleMouseLeave = () => { isDown.current = false; };
  const handleMouseUp = () => { isDown.current = false; };
  const handleMouseMove = (e) => {
    if (!isDown.current) return;
    e.preventDefault();
    const x = e.pageX - rowRef.current.offsetLeft;
    const walk = (x - startX.current) * 2; 
    rowRef.current.scrollLeft = scrollLeft.current - walk;
  };

  // Load full thư viện món ăn 1 lần (đảm bảo "Xem tất cả" có đủ ~333 món)
  useEffect(() => {
    setAllFoodsLoading(true);
    let mounted = true;
    nutritionService
      .getFoods('', '')
      .then((res) => {
        if (!mounted) return;
        setAllFoods(res.data.data || []);
      })
      .catch(console.error)
      .finally(() => {
        if (!mounted) return;
        setAllFoodsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Lọc theo query/category trên bộ dữ liệu đã tải
  useEffect(() => {
    const handle = setTimeout(() => {
      const q = foodQuery.trim().toLowerCase();
      const cat = selectedCategory;
      const filtered = (allFoods || []).filter((f) => {
        const matchesCategory = !cat || f.category === cat;
        const matchesQuery = !q || (f.name || '').toLowerCase().includes(q) || (f.category || '').toLowerCase().includes(q);
        return matchesCategory && matchesQuery;
      });
      setLibraryFoods(filtered);
    }, 250);
    return () => clearTimeout(handle);
  }, [foodQuery, selectedCategory, allFoods]);

  useEffect(() => {
    nutritionService.getFoods('', 'Cá nhân').then(res => setQuickMeals(res.data.data)).catch(console.error);
  }, []);

  const handleCreateFood = async (e) => {
    e.preventDefault();
    if (!newFood.name) return toast.error('Vui lòng nhập tên món ăn');
    const cal = Number(newFood.calories);
    if (!Number.isFinite(cal) || cal <= 0) {
      return toast.error('Cần có calo. Bạn có thể bấm "Ước tính bằng AI" để tự điền calo/macro.');
    }
    try {
      setFoodSaving(true);
      const res = await nutritionService.createFood({ ...newFood, category: 'Cá nhân' });
      setQuickMeals([res.data.data, ...quickMeals]);
      setShowCreateFood(false);
      setNewFood({ name: '', calories: '', protein: '', carbs: '', fat: '' });
      toast.success('Đã lưu vào danh sách món ăn cá nhân!');
    } catch (err) {
      toast.error('Lỗi khi lưu món ăn');
    } finally {
      setFoodSaving(false);
    }
  };

  const parseLabeledNumber = (text, label) => {
    const safeText = String(text || '');
    const re = new RegExp(`${label}\\s*[:=]\\s*([0-9]+(?:[\\.,][0-9]+)?)`, 'i');
    const m = re.exec(safeText);
    if (!m) return null;
    const raw = m[1].replace(',', '.');
    const num = Number(raw);
    return Number.isFinite(num) ? num : null;
  };

  const estimateFoodWithAI = async () => {
    const name = newFood.name?.trim();
    if (!name) return toast.error('Hãy nhập tên món ăn trước');
    if (foodAiBusy) return;

    setFoodAiBusy(true);
    try {
      const prompt =
        `Ước tính dinh dưỡng cho món ăn: "${name}".\n` +
        `Hãy trả về đúng 4 dòng theo mẫu (không thêm bất kỳ chữ nào khác):\n` +
        `CALORIES: <số kcal>\n` +
        `PROTEIN: <số g>\n` +
        `CARBS: <số g>\n` +
        `FAT: <số g>\n` +
        `Ước lượng theo 1 khẩu phần ăn thông thường. Nếu không chắc chắn, hãy đưa ước lượng hợp lý.`;

      const res = await sendChatMessage(prompt, []);
      const reply = res.data?.data?.reply || '';

      const calories = parseLabeledNumber(reply, 'CALORIES');
      const protein = parseLabeledNumber(reply, 'PROTEIN');
      const carbs = parseLabeledNumber(reply, 'CARBS');
      const fat = parseLabeledNumber(reply, 'FAT');

      if ([calories, protein, carbs, fat].some((v) => v == null)) {
        toast.error('AI không trả về đủ số liệu. Bạn thử lại hoặc nhập tay.');
        return;
      }

      setNewFood((prev) => ({
        ...prev,
        calories: Math.round(calories).toString(),
        protein: Math.round(protein).toString(),
        carbs: Math.round(carbs).toString(),
        fat: Math.round(fat).toString(),
      }));
      toast.success('AI đã ước tính calo/macro cho món này');
    } catch {
      toast.error('Không ước tính được bằng AI (lỗi server hoặc thiếu API key).');
    } finally {
      setFoodAiBusy(false);
    }
  };

  useEffect(() => {
    if (customMeal.name.trim().length > 0) {
      const delayFn = setTimeout(() => {
        nutritionService.getFoods(customMeal.name).then(res => {
          setFoodSuggestions(res.data.data);
          setShowSuggestions(true);
        }).catch(console.error);
      }, 300);
      return () => clearTimeout(delayFn);
    } else {
      setFoodSuggestions([]);
      setShowSuggestions(false);
    }
  }, [customMeal.name]);

  const selectSuggestion = (food) => {
    setCustomMeal({ name: food.name, calories: food.calories, protein: food.protein, carbs: food.carbs, fat: food.fat });
    setShowSuggestions(false);
  };

  useEffect(() => {
    // Lấy ngày hiện tại định dạng YYYY-MM-DD để query lịch sử hôm nay
    const todayStr = new Date().toISOString().split('T')[0];

    Promise.all([
      dailySummaryService.getToday(),
      nutritionService.getHistory({ date: todayStr })
    ])
      .then(([summaryRes, historyRes]) => {
        let totalCals = 0;
        let totalGlucose = 0;
        const historyItems = historyRes.data?.data || [];
        if (historyItems.length > 0) {
          setMeals(historyItems.map(m => {
            totalCals += (m.macros?.calories || 0);
            totalGlucose += (m.macros?.glucose || 0);
            return {
              id: m._id,
              label: m.foodItem,
              calories: m.macros?.calories || 0,
              glucose: m.macros?.glucose || 0,
              mealType: m.mealType
            };
          }));
        }
        setCaloriesToday(totalCals);
        
        // Cache object into window variable for cross-request tracking
        window.tempGlucoseToday = totalGlucose;
        
        // Đồng bộ ngược lại database nếu Local Cache bị lệch do xóa thủ công
        if (summaryRes.data && (summaryRes.data.caloriesConsumed !== totalCals || summaryRes.data.glucoseConsumed !== totalGlucose)) {
          dailySummaryService.updateToday({ caloriesConsumed: totalCals, glucoseConsumed: totalGlucose }).catch(console.error);
        }
      })
      .catch(() => toast.error('Không tải được dữ liệu dinh dưỡng hôm nay'))
      .finally(() => setLoading(false));
  }, []);

  const smartTargets = calcSmartTargets(user);
  const targetCalories = smartTargets?.targetIntake ?? user?.autoStats?.tdee ?? 1796;
  const remaining = Math.max(targetCalories - caloriesToday, 0);

  // Heuristic cho "rau/củ/quả" chỉ dựa vào từ khóa trong `name`/`category`
  const vegKeywords = [
    'rau', 'salad', 'cải', 'bông cải', 'bắp cải', 'cà chua', 'tomato', 'cà rốt', 'carrot', 'dưa leo', 'cucumber',
    'hành', 'tỏi', 'ớt', 'ớt chuông', 'ớt hiểm', 'hành tây', 'onion', 'ngô', 'bắp', 'quả', 'trái cây', 'fruit',
  ];

  const isVegOrFruit = (food) => {
    const name = (food?.name || '').toLowerCase();
    const category = (food?.category || '').toLowerCase();
    if (!name && !category) return false;
    return vegKeywords.some((k) => name.includes(k) || category.includes(k));
  };

  const pickFoodClosest = (foods, target, usedSet) => {
    const candidates = (foods || [])
      .filter((f) => typeof f?.calories === 'number' && f.calories > 0)
      .map((f) => ({ f, diff: Math.abs(f.calories - target) }))
      .sort((a, b) => a.diff - b.diff);

    if (!candidates.length) return null;
    const pick = candidates.find(({ f }) => !usedSet?.has(f._id));
    return (pick?.f || candidates[0].f);
  };

  const generateMealPlan7Days = () => {
    if (!Array.isArray(libraryFoods) || libraryFoods.length < 10) {
      toast.error('Món trong thư viện chưa đủ để tạo thực đơn');
      return;
    }

    setPlanBusy(true);
    try {
      const foods = libraryFoods.filter((f) => typeof f?.calories === 'number' && f.calories > 0);
      const vegFoods = foods.filter(isVegOrFruit);
      const mainFoods = foods.filter((f) => !isVegOrFruit(f));

      const effectiveMainFoods = mainFoods.length ? mainFoods : foods;
      const effectiveVegFoods = vegFoods.length ? vegFoods : foods;

      const now = new Date();
      const usedFoodIds = new Set();

      const mealPlan = Array.from({ length: 7 }).map((_, dayIdx) => {
        const d = new Date(now);
        d.setDate(now.getDate() + dayIdx);
        const dateStr = d.toISOString().split('T')[0];

        const breakfastTarget = Math.round(targetCalories * 0.25);
        const lunchTarget = Math.round(targetCalories * 0.35);
        const snackTarget = Math.round(targetCalories * 0.15);
        const dinnerTarget = Math.round(targetCalories * 0.25);
        const vegTarget = Math.max(80, Math.round(targetCalories * 0.07));

        const breakfast = pickFoodClosest(effectiveMainFoods, breakfastTarget, usedFoodIds);
        if (breakfast?._id) usedFoodIds.add(breakfast._id);
        const lunch = pickFoodClosest(effectiveMainFoods, lunchTarget, usedFoodIds);
        if (lunch?._id) usedFoodIds.add(lunch._id);
        const snack = pickFoodClosest(effectiveMainFoods, snackTarget, usedFoodIds);
        if (snack?._id) usedFoodIds.add(snack._id);
        const dinner = pickFoodClosest(effectiveMainFoods, dinnerTarget, usedFoodIds);
        if (dinner?._id) usedFoodIds.add(dinner._id);
        const veg = pickFoodClosest(effectiveVegFoods, vegTarget, usedFoodIds);
        if (veg?._id) usedFoodIds.add(veg._id);

        return {
          dateStr,
          meals: {
            Breakfast: breakfast,
            Lunch: lunch,
            Snack: snack, // map từ "Chiều"
            Dinner: dinner,
          },
          veg,
        };
      });

      setMealPlan7d(mealPlan);
      toast.success('Đã tạo thực đơn 7 ngày (gợi ý)');
    } catch {
      toast.error('Tạo thực đơn thất bại');
    } finally {
      setPlanBusy(false);
    }
  };

  const addCalories = (amount, label, mealType = 'Snack', additionalMacros = { protein: 0, carbs: 0, fat: 0, glucose: 0 }) => {
    const newTotal = caloriesToday + amount;
    const newGlucose = (window.tempGlucoseToday || 0) + (additionalMacros.glucose || 0);
    window.tempGlucoseToday = newGlucose;
    setAdding(true);

    // Lưu thông tin bữa ăn chi tiết vào API nutrition
    nutritionService.addMeal({
      foodItem: label,
      mealType: mealType,
      macros: { calories: amount, ...additionalMacros }
    })
      .then((mealRes) => {
        // Sau đó cộng dồn calo và đường vào trang DailySummary
        return dailySummaryService.updateToday({ caloriesConsumed: newTotal, glucoseConsumed: newGlucose })
          .then((res) => {
            setCaloriesToday(res.data.caloriesConsumed ?? newTotal);
            const savedMeal = mealRes.data?.data;
            setMeals((prev) => [
              { id: savedMeal?._id || Date.now(), label, calories: amount, mealType },
              ...prev,
            ]);
            toast.success(`Đã thêm ${amount} cal · ${label}`);
          });
      })
      .catch(() => toast.error('Không cập nhật được bữa ăn hôm nay'))
      .finally(() => setAdding(false));
  };

  // --- Lịch sử ăn uống (Tuần / Tháng) ---
  useEffect(() => {
    fetchHistoryData(historyView);
  }, [historyView, meals.length]); // Refresh khi thêm bữa ăn mới

  const fetchHistoryData = async (view) => {
    setLoadingHistory(true);
    try {
      const end = new Date();
      const start = new Date();
      if (view === 'week') {
        start.setDate(end.getDate() - 6); // 7 days (today + 6 past)
      } else {
        // Month view: get the first day of the current month, and the last day
        start.setDate(1);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0); 
      }

      const endStr = end.toISOString().split('T')[0];
      const startStr = start.toISOString().split('T')[0];

      const res = await nutritionService.getHistory({ startDate: startStr, endDate: endStr });
      const rawData = res.data?.data || [];
      
      // Aggregate data by Date -> MealType
      const grouped = {};
      rawData.forEach(item => {
        const itemDateStr = item.date.split('T')[0]; // format YYYY-MM-DD
        if (!grouped[itemDateStr]) {
          grouped[itemDateStr] = { 
            dateStr: itemDateStr, 
            Breakfast: 0, 
            Lunch: 0, 
            Dinner: 0, 
            Snack: 0, 
            Total: 0, 
            timestamp: new Date(item.date).getTime() 
          };
        }
        const cal = item.macros?.calories || 0;
        const mt = item.mealType || 'Snack';
        grouped[itemDateStr][mt] += cal;
        grouped[itemDateStr].Total += cal;
      });

      // Sort by newest date first
      const sortedArray = Object.values(grouped).sort((a, b) => b.timestamp - a.timestamp);
      setHistoryData(sortedArray);
    } catch (err) {
      console.error('Lỗi khi tải lịch sử:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const getDayName = (dateStr) => {
    const today = new Date().toISOString().split('T')[0];
    if (dateStr === today) return 'Hôm nay';
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (dateStr === yesterday.toISOString().split('T')[0]) return 'Hôm qua';

    const dayIndex = new Date(dateStr).getDay();
    const days = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
    return days[dayIndex];
  };

  const getCalorieStatusColor = (total) => {
    const target = targetCalories;
    if (total === 0) return 'transparent'; // Not logged
    // Dung sai +- 100 calo coi như đạt (xanh lá)
    if (Math.abs(total - target) <= 100) return '#22c55e'; // Green
    if (total > target + 100) return '#ef4444'; // Red (Lố calo)
    return '#3b82f6'; // Blue (Thiếu calo)
  };

  // Generate calendar grid for current month
  const renderCalendar = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    
    const firstDay = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    const grid = [];
    // Adjust so Monday is first (index 0), Sunday is last (index 6)
    const startOffset = firstDay === 0 ? 6 : firstDay - 1; 

    for (let i = 0; i < startOffset; i++) {
        grid.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const d = new Date(currentYear, currentMonth, day);
        // bù giờ locale để lấy yyyy-mm-dd chuẩn
        const localOffset = d.getTimezoneOffset() * 60000;
        const dateStr = new Date(d.getTime() - localOffset).toISOString().split('T')[0];
        
        const dayData = historyData.find(h => h.dateStr === dateStr);
        const totalCal = dayData ? dayData.Total : 0;
        const dotColor = getCalorieStatusColor(totalCal);
        
        const isSelected = selectedMonthDate === dateStr;
        const isToday = dateStr === today.toISOString().split('T')[0];
        const hasData = totalCal > 0;

        grid.push(
            <div 
              key={`day-${day}`} 
              className={`calendar-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
              onClick={() => setSelectedMonthDate(dateStr)}
              style={{
                background: isSelected ? 'var(--fitbit-teal)' : 'var(--fitbit-card)',
                color: isSelected ? '#000' : 'var(--fitbit-text)',
                borderRadius: '8px',
                padding: '10px 5px',
                textAlign: 'center',
                cursor: 'pointer',
                border: isToday ? '1px solid var(--fitbit-teal)' : '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                minHeight: '60px',
                transition: 'all 0.2s'
              }}
            >
              <span style={{ fontWeight: isSelected || isToday ? 'bold' : 'normal', fontSize: '1.1rem' }}>{day}</span>
              {hasData && (
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isSelected ? '#000' : dotColor }}></div>
              )}
            </div>
        );
    }

    return grid;
  };

  const selectedMonthData = historyData.find(h => h.dateStr === selectedMonthDate);

  const handleSubmitCustom = (e) => {
    e.preventDefault();
    if (!customMeal.calories) return;
    const amount = Number(customMeal.calories);
    if (Number.isNaN(amount) || amount <= 0) {
      toast.error('Calo phải là số dương');
      return;
    }
    addCalories(amount, customMeal.name || 'Bữa ăn tùy chỉnh', 'Snack', { 
      protein: customMeal.protein || 0, 
      carbs: customMeal.carbs || 0, 
      fat: customMeal.fat || 0,
      glucose: 0 // Tuỳ chỉnh ko có glucose default
    });
    setCustomMeal({ name: '', calories: '', protein: 0, carbs: 0, fat: 0 });
  };

  if (loading) {
    return (
      <div className="nutrition-page">
        <h1 className="page-full-title">Dinh dưỡng</h1>
        <div className="today-sections">
          <section className="today-section">
            <h2 className="today-section-title">Đang tải...</h2>
            <div className="today-cards today-cards--1col">
              <div className="fitbit-card card-dark">
                <div className="skeleton-block" style={{ height: 24, width: '40%', marginBottom: 12 }} />
                <div className="skeleton-block" style={{ height: 40, width: '60%', marginBottom: 8 }} />
                <div className="skeleton-block" style={{ height: 20, width: '50%' }} />
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="nutrition-page">
      <h1 className="page-full-title">Dinh dưỡng</h1>
      <div className="today-sections">
        <section className="today-section">
          <h2 className="today-section-title">Tổng quan hôm nay</h2>
          <div className="today-cards today-cards--2col">
            <div className="fitbit-card">
              <div className="fitbit-card-body">
                <p className="fitbit-card-title">Calories đã ăn</p>
                <p className="fitbit-card-value">{caloriesToday.toLocaleString()} cal</p>
                <p className="fitbit-card-sub">Mục tiêu: {targetCalories.toLocaleString()} cal</p>
              </div>
              <div className="fitbit-card-icon"><i className="bi bi-egg-fried" /></div>
            </div>
            <div className="fitbit-card">
              <div className="fitbit-card-body">
                <p className="fitbit-card-title">Còn lại</p>
                <p className="fitbit-card-value">{remaining.toLocaleString()} cal</p>
                <p className="fitbit-card-sub">Hôm nay</p>
              </div>
              <div className="fitbit-card-icon"><i className="bi bi-heart-pulse" /></div>
            </div>
          </div>
        </section>

        <section className="today-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 className="today-section-title" style={{ margin: 0 }}>Thư viện món ăn</h2>
            <button
              className="coach-see-all"
              onClick={() => {
                // "Xem tất cả" nghĩa là bỏ lọc/search để hiển thị đầy đủ dữ liệu ~333 món
                setSelectedCategory('');
                setFoodQuery('');
                setShowAllLibrary(true);
              }}
            >
              Xem tất cả
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', marginBottom: '1rem' }}>
            <div className="coach-filters" style={{ padding: 0, display: 'flex', flexWrap: 'wrap', gap: '8px', overflowX: 'visible', flex: 1 }}>
              {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map(meal => (
                <button 
                  key={meal} 
                  className={`coach-pill ${activeMealTab === meal ? 'coach-pill--active' : ''}`}
                  onClick={() => setActiveMealTab(meal)}
                >
                  {meal === 'Breakfast' ? 'Bữa sáng' : meal === 'Lunch' ? 'Bữa trưa' : meal === 'Dinner' ? 'Bữa tối' : 'Bữa phụ'}
                </button>
              ))}
            </div>
              <input
                type="text"
                value={foodQuery}
                onChange={(e) => setFoodQuery(e.target.value)}
                placeholder="Tìm món ăn..."
                style={{
                  background: 'var(--fitbit-card)',
                  color: 'var(--fitbit-text)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '20px',
                  padding: '6px 14px',
                  fontSize: '0.85rem',
                  outline: 'none',
                  minWidth: '220px',
                }}
              />
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              style={{
                background: 'var(--fitbit-card)',
                color: 'var(--fitbit-text)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '20px',
                padding: '6px 14px',
                fontSize: '0.85rem',
                cursor: 'pointer',
                outline: 'none',
                minWidth: '130px'
              }}
            >
              {FOOD_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat === '' ? '📦 Tất cả loại' : cat}</option>
              ))}
            </select>
          </div>
          <div 
            className="coach-card-row hide-scrollbar" 
            ref={rowRef}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            style={{ paddingBottom: '16px', display: 'flex', gap: '16px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', cursor: 'grab' }}
          >
            {libraryFoods.length === 0 ? (
              <div style={{ padding: '2rem 1rem', width: '100%', textAlign: 'center' }}>
                <p style={{ margin: 0, color: 'var(--fitbit-muted)' }}>Không có món phù hợp với bộ lọc hiện tại.</p>
                <p style={{ margin: '8px 0 0', color: 'var(--fitbit-muted)', fontSize: '0.85rem' }}>
                  Thử đổi `category` hoặc nhập từ khóa trong ô tìm kiếm.
                </p>
              </div>
            ) : (
              libraryFoods.map((food) => (
                <div key={food._id} className="coach-card" style={{ minWidth: '200px', flexShrink: 0 }}>
                  <div
                    className="coach-card-image-wrap"
                    role="button"
                    tabIndex={0}
                    aria-label={`Thêm ${food.name} vào ${activeMealTab}`}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter' && e.key !== ' ') return;
                      e.preventDefault();
                      addCalories(food.calories, food.name, activeMealTab, { protein: food.protein, carbs: food.carbs, fat: food.fat, glucose: food.glucose || 0 });
                    }}
                    onClick={() => addCalories(food.calories, food.name, activeMealTab, { protein: food.protein, carbs: food.carbs, fat: food.fat, glucose: food.glucose || 0 })}
                  >
                    <img src={getFoodImageSrc(food)} alt={food.name} className="coach-card-image" draggable="false" style={{ cursor: 'pointer', height: '140px', objectFit: 'cover' }} />
                    <span className="coach-card-play" style={{ cursor: 'pointer', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="bi bi-plus" style={{ fontSize: '1.5rem', marginLeft: 0 }} /></span>
                  </div>
                  <h3 className="coach-card-title" style={{ marginTop: '12px' }}>{food.name}</h3>
                  <p className="coach-card-meta">{food.calories} cal · {food.category}</p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="today-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 className="today-section-title" style={{ margin: 0 }}>Món ăn cá nhân của bạn</h2>
            <button className="coach-see-all" onClick={() => setShowCreateFood(true)}>+ Tạo món mới</button>
          </div>
          <div className="today-cards today-cards--3col">
            {quickMeals.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem 1rem', background: 'var(--fitbit-card)', borderRadius: '12px' }}>
                <p style={{ color: 'var(--fitbit-muted)', marginBottom: '10px' }}>Chưa có món ăn cá nhân nào.</p>
                <button type="button" className="btn btn-fitbit" onClick={() => setShowCreateFood(true)}>Tạo món ăn đầu tiên</button>
              </div>
            ) : (
              quickMeals.map((m) => (
                <button
                  key={m._id}
                  type="button"
                  className="fitbit-card btn-quick-meal"
                  disabled={adding}
                  onClick={() => addCalories(m.calories, m.name, 'Snack', { protein: m.protein, carbs: m.carbs, fat: m.fat, glucose: m.glucose || 0 })}
                >
                  <div className="fitbit-card-body">
                    <p className="fitbit-card-title">{m.name}</p>
                    <p className="fitbit-card-value">{m.calories} cal</p>
                    <p className="fitbit-card-sub">P: {m.protein}g · C: {m.carbs}g · F: {m.fat}g</p>
                  </div>
                  <div className="fitbit-card-icon"><i className="bi bi-plus-lg" /></div>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="today-section">
          <h2 className="today-section-title" style={{ fontSize: '1.1rem' }}>Thực đơn 7 ngày (gợi ý)</h2>
          <div className="today-cards today-cards--2col">
            <div className="fitbit-card card-dark" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                <p className="fitbit-card-title" style={{ margin: 0, fontSize: '0.92rem' }}>Mục tiêu mỗi ngày</p>
                <p className="fitbit-card-value" style={{ margin: 0 }}>{targetCalories.toLocaleString()} cal</p>
              </div>

              <button
                type="button"
                className="btn btn-fitbit"
                onClick={generateMealPlan7Days}
                disabled={planBusy || libraryFoods.length < 10}
                style={{ width: '100%' }}
              >
                {planBusy ? 'Đang tạo...' : 'Tạo thực đơn 7 ngày'}
              </button>

              <p className="fitbit-card-sub" style={{ marginTop: '10px', fontSize: '0.8rem' }}>
                Chia: Sáng/Trưa/Chiều/Tối + (Rau/củ/quả).
              </p>
            </div>

            <div className="fitbit-card card-dark" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <p className="fitbit-card-title" style={{ marginBottom: 6, fontSize: '0.92rem' }}>Ghi chú</p>
              <p className="fitbit-card-sub" style={{ margin: 0, fontSize: '0.8rem' }}>
                Gợi ý được chọn theo calo gần mục tiêu và heuristics từ từ khóa “rau/củ/quả”.
              </p>
            </div>
          </div>

          {mealPlan7d && (
            <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {mealPlan7d.map((day, idx) => {
                const date = new Date(day.dateStr);
                const dayLabel = date.toLocaleDateString('vi-VN', { weekday: 'long' });
                return (
                  <div key={day.dateStr} className="fitbit-card card-dark" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                      <p className="fitbit-card-title" style={{ margin: 0, fontSize: '0.92rem' }}>Ngày {idx + 1}</p>
                      <p className="fitbit-card-sub" style={{ margin: 0, fontSize: '0.8rem' }}>{dayLabel}</p>
                    </div>

                    <p className="fitbit-card-sub" style={{ margin: 0, fontSize: '0.82rem' }}>
                      Sáng: <strong style={{ color: '#fff', fontSize: '0.92rem' }}>{day.meals.Breakfast?.name || '—'}</strong> ({day.meals.Breakfast?.calories ?? 0} cal)
                    </p>
                    <p className="fitbit-card-sub" style={{ margin: 0, fontSize: '0.82rem' }}>
                      Trưa: <strong style={{ color: '#fff', fontSize: '0.92rem' }}>{day.meals.Lunch?.name || '—'}</strong> ({day.meals.Lunch?.calories ?? 0} cal)
                    </p>
                    <p className="fitbit-card-sub" style={{ margin: 0, fontSize: '0.82rem' }}>
                      Chiều: <strong style={{ color: '#fff', fontSize: '0.92rem' }}>{day.meals.Snack?.name || '—'}</strong> ({day.meals.Snack?.calories ?? 0} cal)
                    </p>
                    <p className="fitbit-card-sub" style={{ margin: 0, fontSize: '0.82rem' }}>
                      Tối: <strong style={{ color: '#fff', fontSize: '0.92rem' }}>{day.meals.Dinner?.name || '—'}</strong> ({day.meals.Dinner?.calories ?? 0} cal)
                    </p>
                    <p className="fitbit-card-sub" style={{ margin: 0, fontSize: '0.82rem' }}>
                      Rau/củ/quả: <strong style={{ color: '#fff', fontSize: '0.92rem' }}>{day.veg?.name || '—'}</strong> ({day.veg?.calories ?? 0} cal)
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Custom Meal Input Section Removed per request */}

        <section className="today-section">
          <h2 className="today-section-title">Bữa ăn đã ghi hôm nay (trong phiên)</h2>
          <div className="today-cards today-cards--1col">
            <div className="fitbit-card card-dark">
              {meals.length === 0 ? (
                <p className="text-muted" style={{ margin: 0 }}>Chưa có bữa nào được thêm trong phiên này.</p>
              ) : (
                <div className="history-list">
                  {meals.map((m) => {
                    const mealTypeMap = { Breakfast: 'Bữa sáng', Lunch: 'Bữa trưa', Dinner: 'Bữa tối', Snack: 'Bữa phụ' };
                    return (
                      <div key={m.id} className="history-list-row">
                        <div className="history-list-label">
                          <span style={{ display: 'inline-block', width: '80px', color: 'var(--fitbit-teal)', fontSize: '0.85rem' }}>
                            {mealTypeMap[m.mealType] || 'Bữa phụ'}
                          </span>
                          {m.label}
                        </div>
                        <div className="history-list-values">
                          <span>{m.calories} cal</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* LỊCH SỬ BỮA ĂN GẦN ĐÂY */}
        <section className="today-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 className="today-section-title" style={{ margin: 0 }}>Lịch sử bữa ăn</h2>
            <div className="coach-filters" style={{ padding: 0, display: 'flex', gap: '8px' }}>
              <button 
                className={`coach-pill ${historyView === 'week' ? 'coach-pill--active' : ''}`}
                onClick={() => setHistoryView('week')}
                style={{ padding: '6px 14px', fontSize: '0.85rem' }}
              >
                7 ngày qua
              </button>
              <button 
                className={`coach-pill ${historyView === 'month' ? 'coach-pill--active' : ''}`}
                onClick={() => setHistoryView('month')}
                style={{ padding: '6px 14px', fontSize: '0.85rem' }}
              >
                30 ngày qua
              </button>
            </div>
          </div>

          <div className="fitbit-card card-dark" style={{ overflowX: 'auto', padding: historyView === 'week' ? '0' : '20px' }}>
            {loadingHistory ? (
               <div style={{ textAlign: 'center', padding: '40px', color: 'var(--fitbit-muted)' }}>
                 <i className="bi bi-arrow-repeat" style={{ fontSize: '2rem', animation: 'spin 1s linear infinite', display: 'block', marginBottom: '8px' }} />
                 Đang tải lịch sử...
               </div>
            ) : historyView === 'week' ? (
              // WEEK VIEW: Table showing days of week
              historyData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--fitbit-muted)' }}>
                  Chưa có dữ liệu nào trong 7 ngày qua.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--fitbit-muted)', background: 'rgba(0,0,0,0.2)' }}>
                      <th style={{ padding: '16px', textAlign: 'left', fontWeight: '500' }}>Ngày</th>
                      <th style={{ padding: '16px', fontWeight: '500' }}>Sáng</th>
                      <th style={{ padding: '16px', fontWeight: '500' }}>Trưa</th>
                      <th style={{ padding: '16px', fontWeight: '500' }}>Tối</th>
                      <th style={{ padding: '16px', fontWeight: '500' }}>Phụ</th>
                      <th style={{ padding: '16px', fontWeight: '500', color: 'var(--fitbit-teal)' }}>Tổng (cal)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Chỉ lấy 7 ngày qua từ mảng historyData (đã fetch cho "week" view là 7 ngày) */}
                    {historyData.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '16px', textAlign: 'left', fontWeight: 'bold' }}>
                          <div>{getDayName(row.dateStr)}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--fitbit-muted)', fontWeight: 'normal' }}>
                            {new Date(row.dateStr).toLocaleDateString('vi-VN')}
                          </div>
                        </td>
                        <td style={{ padding: '16px', color: row.Breakfast > 0 ? '#fff' : 'rgba(255,255,255,0.2)' }}>{row.Breakfast > 0 ? row.Breakfast : '-'}</td>
                        <td style={{ padding: '16px', color: row.Lunch > 0 ? '#fff' : 'rgba(255,255,255,0.2)' }}>{row.Lunch > 0 ? row.Lunch : '-'}</td>
                        <td style={{ padding: '16px', color: row.Dinner > 0 ? '#fff' : 'rgba(255,255,255,0.2)' }}>{row.Dinner > 0 ? row.Dinner : '-'}</td>
                        <td style={{ padding: '16px', color: row.Snack > 0 ? '#fff' : 'rgba(255,255,255,0.2)' }}>{row.Snack > 0 ? row.Snack : '-'}</td>
                        <td style={{ padding: '16px', color: 'var(--fitbit-teal)', fontWeight: 'bold' }}>{row.Total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : (
              // MONTH VIEW: Calendar Grid & Selected Day Details
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                {/* Cột trái: Lịch */}
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px', marginBottom: '8px' }}>
                    {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => (
                      <div key={d} style={{ textAlign: 'center', color: 'var(--fitbit-muted)', fontSize: '0.85rem', fontWeight: 'bold' }}>{d}</div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px', marginBottom: '20px' }}>
                    {renderCalendar()}
                  </div>
                  
                  {/* Lệnh chú thích màu */}
                  <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', fontSize: '0.8rem', color: 'var(--fitbit-muted)', marginBottom: '24px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }}></div> Đạt mục tiêu</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }}></div> Thiếu calo</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }}></div> Lố calo</span>
                  </div>
                </div>

                {/* Cột phải: Chi tiết ngày đã chọn */}
                <div>
                  <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '20px', height: '100%' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: 'var(--fitbit-teal)' }}>
                      Chi tiết: {getDayName(selectedMonthDate)} ({new Date(selectedMonthDate).toLocaleDateString('vi-VN')})
                    </h3>
                    
                    {!selectedMonthData || selectedMonthData.Total === 0 ? (
                      <p style={{ color: 'var(--fitbit-muted)', margin: 0 }}>Không có dữ liệu bữa ăn cho ngày này.</p>
                    ) : (
                      <div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                          <div style={{ background: 'var(--fitbit-card)', padding: '12px 16px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--fitbit-muted)' }}>Bữa sáng</span>
                            <span style={{ fontWeight: 'bold' }}>{selectedMonthData.Breakfast > 0 ? `${selectedMonthData.Breakfast} cal` : '-'}</span>
                          </div>
                          <div style={{ background: 'var(--fitbit-card)', padding: '12px 16px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--fitbit-muted)' }}>Bữa trưa</span>
                            <span style={{ fontWeight: 'bold' }}>{selectedMonthData.Lunch > 0 ? `${selectedMonthData.Lunch} cal` : '-'}</span>
                          </div>
                          <div style={{ background: 'var(--fitbit-card)', padding: '12px 16px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--fitbit-muted)' }}>Bữa tối</span>
                            <span style={{ fontWeight: 'bold' }}>{selectedMonthData.Dinner > 0 ? `${selectedMonthData.Dinner} cal` : '-'}</span>
                          </div>
                          <div style={{ background: 'var(--fitbit-card)', padding: '12px 16px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--fitbit-muted)' }}>Bữa phụ</span>
                            <span style={{ fontWeight: 'bold' }}>{selectedMonthData.Snack > 0 ? `${selectedMonthData.Snack} cal` : '-'}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: 'var(--fitbit-card)', borderRadius: '8px', borderLeft: `4px solid ${getCalorieStatusColor(selectedMonthData.Total)}` }}>
                          <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Tổng cộng</span>
                          <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--fitbit-teal)' }}>{selectedMonthData.Total} cal</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        </section>
      </div>

      {showAllLibrary && (
        <div className="coach-modal-overlay" style={{ zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={() => setShowAllLibrary(false)}>
          <div className="coach-modal" style={{ width: '90%', maxWidth: '1000px', maxHeight: '85vh', background: 'var(--fitbit-card)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: 'var(--fitbit-teal)' }}>Thư viện món ăn</h2>
              <button onClick={() => setShowAllLibrary(false)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>
                <i className="bi bi-x" />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div className="coach-filters" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', overflowX: 'visible', flex: 1 }}>
                {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map(meal => (
                  <button 
                    key={meal} 
                    className={`coach-pill ${activeMealTab === meal ? 'coach-pill--active' : ''}`}
                    onClick={() => setActiveMealTab(meal)}
                  >
                    {meal === 'Breakfast' ? 'Bữa sáng' : meal === 'Lunch' ? 'Bữa trưa' : meal === 'Dinner' ? 'Bữa tối' : 'Bữa phụ'}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={foodQuery}
                onChange={(e) => setFoodQuery(e.target.value)}
                placeholder="Tìm món ăn..."
                style={{
                  background: 'var(--fitbit-card)',
                  color: 'var(--fitbit-text)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '20px',
                  padding: '6px 14px',
                  fontSize: '0.85rem',
                  outline: 'none',
                  minWidth: '220px',
                }}
              />
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                style={{
                  background: 'var(--fitbit-bg)',
                  color: 'var(--fitbit-text)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '20px',
                  padding: '6px 14px',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  outline: 'none',
                  minWidth: '140px'
                }}
              >
                {FOOD_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat === '' ? '📦 Tất cả loại' : cat}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px', overflowY: 'auto', paddingRight: '10px' }} className="hide-scrollbar">
              {libraryFoods.length === 0 ? (
                <div style={{ padding: '2rem 1rem', width: '100%', textAlign: 'center', gridColumn: '1 / -1' }}>
                  <p style={{ margin: 0, color: 'var(--fitbit-muted)' }}>Không có món phù hợp để hiển thị.</p>
                </div>
              ) : (
                libraryFoods.map((food) => (
                  <div key={food._id} className="coach-card">
                    <div
                      className="coach-card-image-wrap"
                      role="button"
                      tabIndex={0}
                      aria-label={`Thêm ${food.name} vào ${activeMealTab}`}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter' && e.key !== ' ') return;
                        e.preventDefault();
                        addCalories(food.calories, food.name, activeMealTab, { protein: food.protein, carbs: food.carbs, fat: food.fat, glucose: food.glucose || 0 });
                        setShowAllLibrary(false);
                      }}
                      onClick={() => {
                        addCalories(food.calories, food.name, activeMealTab, { protein: food.protein, carbs: food.carbs, fat: food.fat, glucose: food.glucose || 0 });
                        setShowAllLibrary(false);
                      }}
                    >
                      <img src={getFoodImageSrc(food)} alt={food.name} className="coach-card-image" draggable="false" style={{ cursor: 'pointer', height: '140px', objectFit: 'cover' }} />
                      <span className="coach-card-play" style={{ cursor: 'pointer', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="bi bi-plus" style={{ fontSize: '1.5rem', marginLeft: 0 }} /></span>
                    </div>
                    <h3 className="coach-card-title" style={{ marginTop: '12px' }}>{food.name}</h3>
                    <p className="coach-card-meta">{food.calories} cal · {food.category}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showCreateFood && (
        <div className="coach-modal-overlay" style={{ zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={() => setShowCreateFood(false)}>
          <div className="coach-modal" style={{ width: '90%', maxWidth: '500px', background: 'var(--fitbit-card)', borderRadius: '16px', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: 'var(--fitbit-teal)' }}>Tạo món ăn mới</h3>
              <button type="button" onClick={() => setShowCreateFood(false)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>
                <i className="bi bi-x" />
              </button>
            </div>
            <form onSubmit={handleCreateFood}>
              <div className="mb-3">
                <label className="form-label">Tên món ăn <span className="text-danger">*</span></label>
                <input type="text" className="form-control" required placeholder="Ví dụ: Sinh tố bơ" value={newFood.name} onChange={(e) => setNewFood({...newFood, name: e.target.value})} />
              </div>
              <div className="mb-3">
                <label className="form-label">
                  Lượng Calo (kcal) <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  className="form-control"
                  placeholder="Ví dụ: 300 (hoặc bấm AI để ước tính)"
                  value={newFood.calories}
                  disabled={foodSaving}
                  onChange={(e) => setNewFood({ ...newFood, calories: e.target.value })}
                />

                <button
                  type="button"
                  className="btn btn-fitbit w-100 mt-2"
                  disabled={foodAiBusy || !newFood.name?.trim()}
                  onClick={estimateFoodWithAI}
                >
                  {foodAiBusy ? 'Đang ước tính...' : 'Ước tính calo/macro bằng AI'}
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div className="mb-3">
                  <label className="form-label">Protein (g)</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    placeholder="0"
                    value={newFood.protein}
                    disabled={foodSaving}
                    onChange={(e) => setNewFood({ ...newFood, protein: e.target.value })}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Carbs (g)</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    placeholder="0"
                    value={newFood.carbs}
                    disabled={foodSaving}
                    onChange={(e) => setNewFood({ ...newFood, carbs: e.target.value })}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Fat (g)</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    placeholder="0"
                    value={newFood.fat}
                    disabled={foodSaving}
                    onChange={(e) => setNewFood({ ...newFood, fat: e.target.value })}
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-fitbit w-100 mt-3" disabled={foodSaving}>
                {foodSaving ? 'Đang lưu...' : 'Lưu món ăn'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Nutrition;

