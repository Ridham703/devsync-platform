import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import Kanban from './pages/Kanban';
import Teams from './pages/Teams';
import Profile from './pages/Profile';
import Analytics from './pages/Analytics';

import { ThemeProvider } from './contexts/ThemeContext';
import { ActivityProvider } from './contexts/ActivityContext';
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <ThemeProvider>
      <ActivityProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Pages */}
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/login" element={<Auth />} />
              <Route path="/register" element={<Auth />} />

              {/* Protected Shell Pages (Internal Application) */}
              <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/kanban" element={<Kanban />} />
                <Route path="/tasks" element={<Navigate to="/kanban" replace />} />
                <Route path="/teams" element={<Teams />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/analytics" element={<Analytics />} />
              </Route>

              {/* Fallback Redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ActivityProvider>
    </ThemeProvider>
  );
}

export default App;
