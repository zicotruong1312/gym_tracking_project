# 🏋️ GymTracking

A full-stack fitness management web application that helps users track workouts, monitor nutrition, analyze health metrics, and receive AI-powered fitness recommendations.

---

## 📋 Table of Contents

- [Project Description](#-project-description)
- [Features](#-features)
- [Technologies Used](#-technologies-used)
- [Prerequisites](#-prerequisites)
- [Installation Guide](#-installation-guide)
- [Environment Variables](#-environment-variables)
- [Seed Data](#-seed-data)

---

## 📖 Project Description

**GymTracking** is a comprehensive health and fitness tracking system built with a modern web stack. It provides users with tools to:

- Log and monitor daily **workouts** and **exercises**
- Track **nutrition** including calories, macronutrients, and meal history
- Compute personal health metrics such as **BMI** and **TDEE**
- Visualize **muscle engagement** through an interactive body heatmap
- Plan fitness goals with an intelligent **Smart Goal Planner** algorithm
- Get personalized **AI-powered recommendations** (powered by Google Gemini)
- Browse and register for **coach-led classes**
- Monitor **sleep patterns** and overall health trends via charts

The application follows a clean **MVC architecture** on the backend with a component-based **React** frontend, communicating via a RESTful API and real-time **Socket.IO** events.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 Authentication | JWT-based registration & login with bcrypt password hashing |
| 📊 Dashboard | Personal health overview with charts (BMI, calorie trends, sleep) |
| 🏃 Workout Tracker | Log exercises with sets, reps, and weights; view history |
| 🥗 Nutrition Logger | Search a large food library, track daily macro/calorie intake |
| 💡 Smart Goal Planner | Algorithm-driven exercise recommendations based on user goals |
| 🔥 Muscle Heatmap | Visual body map highlighting muscles worked per session |
| 🤖 AI Recommendations | Google Gemini-powered fitness & nutrition advice |
| 👨‍🏫 Coach Classes | Browse instructors and enroll in gym classes |
| 😴 Sleep Tracker | Log and analyze nightly sleep duration and quality |
| ⚡ Real-time | Socket.IO integration for live updates |

---

## 🛠 Technologies Used

### Backend
| Technology | Version | Purpose |
|---|---|---|
| **Node.js** | ≥ 18.x | JavaScript runtime |
| **Express.js** | ^4.21.0 | Web framework & RESTful API |
| **MongoDB** | Latest | NoSQL document database |
| **Mongoose** | ^8.8.0 | MongoDB object modeling (ODM) |
| **JSON Web Token** | ^9.0.2 | Stateless authentication |
| **bcryptjs** | ^2.4.3 | Password hashing |
| **Socket.IO** | ^4.8.3 | Real-time bidirectional communication |
| **@google/generative-ai** | ^0.24.1 | Google Gemini AI integration |
| **dotenv** | ^16.4.5 | Environment variable management |
| **cors** | ^2.8.5 | Cross-origin resource sharing |
| **nodemon** | ^3.1.4 | Auto-restart during development |

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| **React** | ^18.3.1 | UI component library |
| **Vite** | ^7.3.1 | Build tool & dev server |
| **React Router DOM** | ^7.0.1 | Client-side routing |
| **Axios** | ^1.7.9 | HTTP client for API requests |
| **Bootstrap 5** | ^5.3.8 | Responsive CSS framework |
| **Bootstrap Icons** | ^1.13.1 | Icon library |
| **Chart.js** | ^4.5.1 | Data visualization & charts |
| **react-body-highlighter** | ^2.0.5 | Interactive muscle heatmap |
| **react-hot-toast** | ^2.6.0 | Toast notifications |
| **Socket.IO Client** | ^4.8.3 | Real-time client connection |

---

## ✅ Prerequisites

Before you begin, ensure you have the following installed on your machine:

- **Node.js** `v18.x` or higher — [Download](https://nodejs.org/)
- **MongoDB** (Community Edition) — [Download](https://www.mongodb.com/try/download/community)
  - Make sure the MongoDB service is **running** on the default port `27017`
- **npm** (comes bundled with Node.js)
- A terminal (PowerShell, Git Bash, or Command Prompt)

---

## 🚀 Installation Guide

> The project consists of two separate sub-applications: **backend** and **frontend**. You will need **two terminal windows** running simultaneously.

### Step 1 — Clone the Repository

```bash
git clone https://github.com/zicotruong1312/gym_tracking_project.git
cd gym_tracking_project
```

---

### Step 2 — Set Up the Backend

Open **Terminal 1** and navigate to the `backend` folder.

```bash
cd backend
```

**1. Install dependencies:**
```bash
npm install
```

**2. Configure environment variables:**

Copy the example file and fill in your values:
```bash
# Windows (PowerShell)
Copy-Item .env.example .env

# macOS / Linux
cp .env.example .env
```

Open `.env` and set your values (see [Environment Variables](#-environment-variables) below).

**3. Seed the database with sample data:**

> ⚠️ **Important:** Make sure MongoDB is running before executing this step.

```bash
npm run seed
```

This command sequentially populates the database with:
- 👤 **Users** — Test accounts with pre-set credentials
- 🏫 **Instructors** — Coach profiles
- 📅 **Coach Classes** — Scheduled gym classes
- 🏷️ **Brands** — Supplement & product brands
- 🍎 **Food Items** — A large library of foods for calorie tracking
- 🏋️ **Exercises** — Exercise library for the Smart Goal Planner

You can also run individual seed files if needed:
```bash
node seedUsers.js
node seedExercises.js
# etc.
```

**4. Start the backend server:**
```bash
# Production mode
npm start

# Development mode (with auto-restart)
npm run dev
```

> ✅ You should see: `Server running on port 5000` and `Connected to MongoDB`

---

### Step 3 — Set Up the Frontend

Open **Terminal 2** (keep Terminal 1 running) and navigate to the `frontend` folder.

```bash
cd frontend
```

**1. Install dependencies:**
```bash
npm install
```

**2. Configure environment variables:**
```bash
# Windows (PowerShell)
Copy-Item .env.example .env

# macOS / Linux
cp .env.example .env
```

Ensure the `.env` file contains:
```
VITE_API_ORIGIN=http://localhost:5000
```

**3. Start the frontend dev server:**
```bash
npm run dev
```

> ✅ The app will be available at: **http://localhost:5173**

---

### Step 4 — Access the Application

1. Open your browser and go to `http://localhost:5173`
2. Register a new account or log in with a pre-seeded test account
3. To find test credentials, check `backend/seedUsers.js` for the pre-populated email/password combinations

---

## 🔑 Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | ✅ | `5000` | Port the server listens on |
| `MONGODB_URI` | ✅ | `mongodb://localhost:27017/gymtracking` | MongoDB connection string |
| `JWT_SECRET` | ✅ | — | Secret key for JWT signing (use a strong random string) |
| `CLIENT_ORIGIN` | ✅ | `http://localhost:5173` | Allowed CORS origins (comma-separated) |
| `GEMINI_API_KEY` | ⚠️ Optional | — | Google Gemini API key for AI features. Get one at [aistudio.google.com](https://aistudio.google.com/apikey) |
| `GEMINI_MODEL` | ⚠️ Optional | auto | Gemini model name (e.g. `gemini-2.0-flash`). Leave blank for auto-selection. |

### Frontend (`frontend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_ORIGIN` | ✅ | `http://localhost:5000` | Backend API base URL |

---

## 🌱 Seed Data

The `npm run seed` command in the backend runs `seedAll.js`, which orchestrates all seeding scripts in order:

```
seedUsers.js        → Test user accounts
seedInstructors.js  → Instructor/coach profiles
seedCoachClasses.js → Available gym classes
seedBrands.js       → Food/supplement brands
seedFoodItems.js    → Food nutrition database (~large dataset)
seedExercises.js    → Exercise library for goal planning
```

> 💡 **Tip:** If you only need to re-seed a specific collection, run the individual script directly with `node <filename>.js` from the `backend/` directory.

---

## 📁 Project Structure

```
GymTracking/
├── backend/
│   ├── src/
│   │   ├── config/         # Database & app configuration
│   │   ├── controllers/    # Route handler logic
│   │   ├── middlewares/    # Auth & request middlewares
│   │   ├── models/         # Mongoose schemas
│   │   ├── routes/         # Express API routes
│   │   ├── services/       # Business logic layer
│   │   └── utils/          # Helper utilities
│   ├── seed*.js            # Database seeding scripts
│   ├── server.js           # Entry point
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable React components
│   │   ├── pages/          # Page-level views
│   │   └── ...
│   ├── index.html
│   └── package.json
│
└── README.md
```

---

<p align="center">Built with ❤️ for CAP126 — GymTracking Project</p>
