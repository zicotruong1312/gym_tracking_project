# GymTracking Project

Dự án GymTracking là một hệ thống quản lý tập luyện và dinh dưỡng bao gồm:
- **Backend:** Node.js, Express, MongoDB (Mongoose).
- **Frontend:** React, Vite.

Dưới đây là hướng dẫn chi tiết từng bước để cài đặt, thiết lập database, và chạy dự án này để chấm điểm/vận hành thử.

---

## 🛠 Yêu cầu hệ thống (Prerequisites)
1. **Node.js**: Khuyên dùng phiên bản 18.x trở lên.
2. **MongoDB**: Cài đặt và đảm bảo dịch vụ MongoDB đang chạy liên tục ở phía dưới nền (local mặc định cổng `27017`).

---

## 🚀 Bước 1: Thiết lập & Chạy Backend

1. Mở một terminal mới (ưu tiên dùng PowerShell hoặc Git Bash).
2. Di chuyển vào thư mục `backend`:
   ```bash
   cd backend
   ```
3. Cài đặt các thư viện phụ thuộc (dependencies):
   ```bash
   npm install
   ```
4. Cấu hình môi trường (`.env`):
   - Sao chép toàn bộ nội dung trong tệp `.env.example` sang một tệp mới tên là `.env`.
   - Đảm bảo trong `.env` có thiết lập kết nối Database (ví dụ: `MONGODB_URI=mongodb://localhost:27017/gymtracking`).
5. Khởi tạo dữ liệu mẫu (Seed Data) vào MongoDB:
   - Trong thư mục `backend`, để nạp **toàn bộ** dữ liệu mẫu (chạy file gộp `seedAll.js`), sử dụng lệnh:
     ```bash
     npm run seed
     ```
   - **Giải thích luồng chạy seed:** Lệnh trên sẽ tự động và tuần tự chạy các file con để bơm dữ liệu đầy đủ cho DB bao gồm:
     - `seedUsers.js`: Mồi dữ liệu các tài khoản Users test mẫu với email/pass có sẵn.
     - `seedInstructors.js`: Tạo thông tin hồ sơ của các Huấn Luyện Viên.
     - `seedCoachClasses.js`: Tạo các Lớp Tập (Classes) do các HLV phụ trách.
     - `seedBrands.js`: Nạp dữ liệu các Thương hiệu thực phẩm bổ sung, phụ kiện.
     - `seedFoodItems.js`: Nạp thư viện Thực phẩm khổng lồ để tính toán Calo/Macros.
     - `seedExercises.js`: Nạp thư viện các Bài Tập Gym đa dạng hỗ trợ xây dựng Smart Goal Planner.
     
   *(Lưu ý: Bạn cũng có thể chạy riêng từng file nếu chỉ cần nạp lại một loại dữ liệu, ví dụ: `node seedUsers.js`). Bước này cực kì quan trọng nhằm chuẩn bị sẵn data để thuận tiện khi thầy cô test mà không cần tự nhập tay mất thời gian.*
6. Khởi động server Backend:
   ```bash
   npm start
   ```
   *(Trường hợp bạn cần test và sửa code có thể dùng lệnh `npm run dev`).*
   > Server sẽ báo hiệu đang chạy trên cổng 5000 (`PORT=5000`) và "Connected to MongoDB".

---

## 💻 Bước 2: Thiết lập & Chạy Frontend

1. Mở **THÊM một terminal mới** (song song với terminal Backend vẫn đang chạy).
2. Di chuyển vào thư mục `frontend`:
   ```bash
   cd frontend
   ```
3. Cài đặt các thư viện phụ thuộc:
   ```bash
   npm install
   ```
4. Cấu hình môi trường (`.env`):
   - Trong thư mục `frontend`, đổi tên file `.env.example` thành `.env` (hoặc tạo file `.env` mới rồi copy nội dung sang).
   - Nội dung mặc định nên có đường dẫn trỏ tới backend: `VITE_API_ORIGIN=http://localhost:5000`
5. Khởi động giao diện Frontend (Vite):
   ```bash
   npm run dev
   ```
   > Ứng dụng Frontend sẽ cung cấp một đường link, thường là `http://localhost:5173`.

---

## 🎉 Bước 3: Sử dụng ứng dụng

1. Mở trình duyệt và truy cập vào đường link Frontend hiển thị ở Bước 2.
2. Tại màn hình thông tin, bạn có thể thực hiện Đăng ký / Đăng nhập.
3. Để có sẵn dữ liệu test chi tiết nhất, bạn có thể xem lại file `backend/seedUsers.js` để thấy thông tin email và mật khẩu của các tài khoản đã được nạp sẵn.

**Hoàn tất cài đặt!**
