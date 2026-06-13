import React, { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FieldLabelsProvider } from './context/FieldLabelsContext';
import { PermissionsProvider } from './context/PermissionsContext';
import { AiConfigProvider } from './context/AiConfigContext';
import Login from './components/Login';
import Layout from './components/Layout';
import ReportsPage from './components/ReportsPage';

// Route-level code splitting: each page chunk loads on demand so the initial
// bundle stays small (e.g. recharts only ships with the pages that chart).
const Dashboard                 = lazy(() => import('./components/Dashboard'));
const AccountsPage              = lazy(() => import('./components/AccountsPage'));
const AccountDetail             = lazy(() => import('./components/AccountDetail'));
const AccountEdit               = lazy(() => import('./components/AccountEdit'));
const AccountTimeline           = lazy(() => import('./components/AccountTimeline'));
const RenewalDashboard          = lazy(() => import('./components/RenewalDashboard'));
const RAGDashboard              = lazy(() => import('./components/RAGDashboard'));
const EscalationsDashboard      = lazy(() => import('./components/EscalationsDashboard'));
const WeeklyEscalationsDashboard = lazy(() => import('./components/WeeklyEscalationsDashboard'));
const IssuesDashboard           = lazy(() => import('./components/IssuesDashboard'));
const IssuesPivotReport         = lazy(() => import('./components/IssuesPivotReport'));
const AccountMappingReport      = lazy(() => import('./components/AccountMappingReport'));
const SettingsPage              = lazy(() => import('./components/SettingsPage'));
const TasksPage                 = lazy(() => import('./components/TasksPage'));
const TaskPivotReport           = lazy(() => import('./components/TaskPivotReport'));
const FeatureRequestsPage       = lazy(() => import('./components/FeatureRequestsPage'));
const FeatureRequestReport      = lazy(() => import('./components/FeatureRequestReport'));
const CustomReportsPage         = lazy(() => import('./components/CustomReportsPage'));
const CustomReportBuilder       = lazy(() => import('./components/CustomReportBuilder'));

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

function AdminOrCxRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return (user?.role === 'admin' || user?.role === 'cx_strategy') ? children : <Navigate to="/" replace />;
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
        <Route path="accounts/:id/timeline" element={<AccountTimeline />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="feature-requests" element={<FeatureRequestsPage />} />
        <Route path="reports" element={<ReportsPage />}>
          <Route index element={<Navigate to="rag" replace />} />
          <Route path="rag"            element={<RAGDashboard />} />
          <Route path="renewals"       element={<RenewalDashboard />} />
          <Route path="weekly"         element={<WeeklyEscalationsDashboard />} />
          <Route path="issues-pivot"   element={<IssuesPivotReport />} />
          <Route path="account-mapping" element={<AccountMappingReport />} />
          <Route path="task-pivot"     element={<TaskPivotReport />} />
          <Route path="feature-requests" element={<FeatureRequestReport />} />
          <Route path="custom"         element={<CustomReportsPage />} />
          <Route path="custom/builder" element={<CustomReportBuilder />} />
        </Route>
        <Route path="renewal" element={<Navigate to="/reports/renewals" replace />} />
        <Route path="rag" element={<Navigate to="/reports/rag" replace />} />
        <Route path="escalations" element={<EscalationsDashboard />} />
        <Route path="escalations/weekly" element={<Navigate to="/reports/weekly" replace />} />
        <Route path="issues" element={<IssuesDashboard />} />
        <Route path="settings" element={<AdminOrCxRoute><SettingsPage /></AdminOrCxRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return <AuthProvider><FieldLabelsProvider><PermissionsProvider><AiConfigProvider><AppRoutes /></AiConfigProvider></PermissionsProvider></FieldLabelsProvider></AuthProvider>;
}
