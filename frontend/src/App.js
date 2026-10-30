import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Auth from './pages/Auth';
import AdminPanel from './pages/AdminPanel';
import PublicComplaints from './pages/PublicComplaints';

function App() {
  const isAuthenticated = !!localStorage.getItem('token');
  const role = localStorage.getItem('role');

  const getDashboardRoute = () => {
    const staffRoles = ['Admin', 'Station Master', 'TT', 'Loco Pilot', 'Guard', 'RPF Officer', 'Section Engineer'];
    if (staffRoles.includes(role)) {
      return '/admin';
    }
    return '/dashboard';
  };

  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <Auth /> : <Navigate to={getDashboardRoute()} />} />
        <Route path="/register" element={!isAuthenticated ? <Auth /> : <Navigate to={getDashboardRoute()} />} />
        <Route path="/public-complaints" element={<PublicComplaints />} />
        <Route path="/dashboard" element={isAuthenticated && role === 'Passenger' ? <Dashboard /> : <Navigate to="/login" />} />
        <Route path="/admin" element={isAuthenticated && role !== 'Passenger' ? <AdminPanel /> : <Navigate to="/login" />} />
        <Route path="/" element={<Navigate to={isAuthenticated ? getDashboardRoute() : '/login'} />} />
      </Routes>
    </Router>
  );
}

export default App;
