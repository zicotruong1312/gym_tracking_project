import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Today from './pages/Today';
import Workout from './pages/Workout';
import Coach from './pages/Coach';
import Stats from './pages/Stats';

function App() {
  return (
    <BrowserRouter>
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
