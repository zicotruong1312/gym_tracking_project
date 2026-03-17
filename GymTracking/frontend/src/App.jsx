import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider } from './context/UserContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Today from './pages/Today';
import Workout from './pages/Workout';
import Coach from './pages/Coach';
import Stats from './pages/Stats';
import Profile from './pages/Profile';
import Nutrition from './pages/Nutrition';
import Sleep from './pages/Sleep';
import Settings from './pages/Settings';
import History from './pages/History';
import Water from './pages/Water';

function App() {
  return (
    <BrowserRouter>
      <UserProvider>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/today"
          element={
            <ProtectedRoute>
              <Layout><Today /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/workout"
          element={
            <ProtectedRoute>
              <Layout><Workout /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/coach"
          element={
            <ProtectedRoute>
              <Layout><Coach /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/stats"
          element={
            <ProtectedRoute>
              <Layout><Stats /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Layout><Profile /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/nutrition"
          element={
            <ProtectedRoute>
              <Layout><Nutrition /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/water"
          element={
            <ProtectedRoute>
              <Layout><Water /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/sleep"
          element={
            <ProtectedRoute>
              <Layout><Sleep /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <Layout><History /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Layout><Settings /></Layout>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </UserProvider>
    </BrowserRouter>
  );
}

export default App;
