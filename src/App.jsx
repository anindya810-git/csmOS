import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import AccountsPage from './components/AccountsPage';
import AccountDetail from './components/AccountDetail';
import RenewalDashboard from './components/RenewalDashboard';
import RAGDashboard from './components/RAGDashboard';
import EscalationsDashboard from './components/EscalationsDashboard';
import WeeklyEscalationsDashboard from './components/WeeklyEscalationsDashboard';
import IssuesDashboard from './components/IssuesDashboard';
import SettingsPage from './components/SettingsPage';
import AccountEdit from './components/AccountEdit';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user?.role === 'admin' ? children : <Navigate to="/" replace />;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="accounts" element={<AccountsPage />} />
        <Route path="accounts/:id" element={<AccountDetail />} />
        <Route path="accounts/:id/edit" element={<AccountEdit />} />
        <Route path="renewal" element={<RenewalDashboard />} />
        <Route path="rag" element={<RAGDashboard />} />
        <Route path="escalations" element={<EscalationsDashboard />} />
        <Route path="escalations/weekly" element={<WeeklyEscalationsDashboard />} />
        <Route path="issues" element={<IssuesDashboard />} />
        <Route path="settings" element={<AdminRoute><SettingsPage /></AdminRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return <AuthProvider><AppRoutes /></AuthProvider>;
}
