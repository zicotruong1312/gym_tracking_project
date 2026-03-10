import 'bootstrap/dist/css/bootstrap.min.css';
// Nhúng icon Bootstrap
import 'bootstrap-icons/font/bootstrap-icons.css';
import './style.css';
// Nhúng Chart.js
import Chart from 'chart.js/auto';

// --- 1. TÍNH NĂNG UỐNG NƯỚC (DOM MANIPULATION) ---
let waterMl = 1250;
const waterConsumedText = document.getElementById('waterConsumedText');
const addWaterBtn = document.getElementById('addWaterBtn');

addWaterBtn.addEventListener('click', () => {
  waterMl += 250; // Mỗi lần bấm thêm 250ml
  waterConsumedText.innerText = `${waterMl} ml consumed`;
  
  // Hiệu ứng nho nhỏ: Nút bấm to lên rồi xẹp xuống
  addWaterBtn.style.transform = "scale(1.2)";
  setTimeout(() => { addWaterBtn.style.transform = "scale(1)"; }, 200);
});

// --- 2. TÍNH NĂNG THÊM BỮA ĂN (VALIDATION & DOM MANIPULATION) ---
let totalConsumed = 850;
let targetCalories = 1796; // Tự cho một số mục tiêu
const addMealBtn = document.getElementById('addMealBtn');
const foodNameInput = document.getElementById('foodName');
const foodCaloInput = document.getElementById('foodCalo');
const mealList = document.getElementById('mealList');
const consumedCaloriesEl = document.getElementById('consumedCalories');
const remainingCaloriesEl = document.getElementById('remainingCalories');
const foodError = document.getElementById('foodError');

addMealBtn.addEventListener('click', () => {
  const name = foodNameInput.value.trim();
  const calo = parseInt(foodCaloInput.value);

  // Client-side Validation: Bắt lỗi nếu nhập thiếu hoặc nhập sai
  if (!name || isNaN(calo) || calo <= 0) {
    foodError.classList.remove('d-none');
    return;
  }
  
  // Nếu hợp lệ, ẩn lỗi đi
  foodError.classList.add('d-none');

  // DOM Manipulation: Chèn thêm 1 dòng <li> vào danh sách bữa ăn
  const newLi = document.createElement('li');
  newLi.className = "list-group-item d-flex justify-content-between align-items-center px-0 bg-light rounded mt-2 p-2 transition";
  newLi.innerHTML = `
    <div class="d-flex align-items-center gap-3">
      <span class="fs-4">🍽️</span>
      <div><p class="mb-0 fw-bold">${name}</p></div>
    </div>
    <span class="fw-bold text-success">+ ${calo} kcal</span>
  `;
  mealList.appendChild(newLi);

  // Update lại số liệu calo tự động
  totalConsumed += calo;
  consumedCaloriesEl.innerText = totalConsumed;
  
  let remaining = targetCalories - totalConsumed;
  remainingCaloriesEl.innerText = remaining < 0 ? 0 : remaining;

  // Reset form
  foodNameInput.value = '';
  foodCaloInput.value = '';
});

// --- 3 & 4. CHUYỂN TAB VÀ VẼ CHART.JS ---
let chartsRendered = false; // Biến cờ hiệu để kiểm tra xem đã vẽ chart chưa

function renderCharts() {
  // 1. Biểu đồ Line Chart (Body Composition)
  const ctxBody = document.getElementById('bodyCompChart').getContext('2d');
  new Chart(ctxBody, {
    type: 'line',
    data: {
      labels: ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
      datasets: [{
        label: 'Waist (cm)',
        data: [85, 82, 79, 77, 76, 75], 
        borderColor: '#6c757d',
        backgroundColor: 'rgba(108, 117, 125, 0.2)', // Đổ bóng xám dưới đường kẻ
        borderWidth: 2,
        fill: true,
        tension: 0.4, // Làm cong đường line cho mềm mại
        pointRadius: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { display: false, min: 70, max: 90 } // Ẩn cột dọc cho giống thiết kế
      }
    }
  });

  // 2. Biểu đồ Bar Chart (Workout)
  const ctxWorkout = document.getElementById('workoutChart').getContext('2d');
  new Chart(ctxWorkout, {
    type: 'bar',
    data: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [{
        data: [1, 1, 0, 1, 1, 1, 0], // 1 là có tập, 0 là nghỉ
        backgroundColor: '#aeb3b8',
        borderRadius: 4,
        barPercentage: 0.6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, border: { display: false } },
        y: { display: false, min: 0, max: 1 }
      }
    }
  });

  // 3. Biểu đồ Doughnut Chart (Body Proportions)
  const ctxProportions = document.getElementById('proportionsChart').getContext('2d');
  new Chart(ctxProportions, {
    type: 'doughnut',
    data: {
      labels: ['Fat', 'Muscle', 'Water', 'Bone'],
      datasets: [{
        data: [25, 45, 25, 5], 
        backgroundColor: ['#6c757d', '#adb5bd', '#ced4da', '#e9ecef'], // Bảng màu xám y hệt thiết kế
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%', // Làm lõng ở giữa tạo hình bánh donut
      plugins: { legend: { display: false } }
    }
  });
}

// Logic chuyển Tab bằng DOM Manipulation
const navLinks = document.querySelectorAll('.nav-link-custom');
const contentSections = document.querySelectorAll('.content-section');
const pageTitle = document.getElementById('page-title');

navLinks.forEach(link => {
  link.addEventListener('click', function(e) {
    e.preventDefault(); // Ngăn chặn trình duyệt load lại trang khi bấm thẻ <a>

    // 1. Cập nhật thanh Menu bên trái
    navLinks.forEach(nav => nav.classList.remove('active-link'));
    this.classList.add('active-link');

    // 2. Cập nhật Tiêu đề trang
    pageTitle.innerText = this.getAttribute('data-title');

    // 3. Ẩn tất cả nội dung
    const targetId = this.getAttribute('data-target');
    contentSections.forEach(section => {
      section.classList.add('d-none'); // Ẩn hết
    });
    
    // 4. Hiển thị section có ID tương ứng
    const targetSection = document.getElementById(targetId);
    targetSection.classList.remove('d-none');
    
    // 5. Tạo hiệu ứng fade-in mượt mà nhỏ nhỏ và VẼ CHART nếu cần
    targetSection.style.opacity = 0;
    setTimeout(() => {
      targetSection.style.transition = "opacity 0.3s ease-in";
      targetSection.style.opacity = 1;

      // KIỂM TRA: Nếu tab là Thống kê và chưa vẽ chart bao giờ thì gọi hàm vẽ
      if (targetId === 'section-stats' && !chartsRendered) {
        renderCharts();
        chartsRendered = true; // Gắn cờ để lần sau click lại không bị vẽ đè đồ thị
      }
    }, 50);
  });
});