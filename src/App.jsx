import React, { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FieldLabelsProvider } from './context/FieldLabelsContext';
import { PermissionsProvider } from './context/PermissionsContext';
import { AiConfigProvider } from './context/AiConfigContext';
import { SuperadminAuthProvider, useSuperadminAuth } from './context/SuperadminAuthContext';
import { TenantBrandProvider, useTenantBrand } from './context/TenantBrandContext';
import Login from './components/Login';
import Layout from './components/Layout';
import ReportsPage from './components/ReportsPage';
import LandingPage from './components/LandingPage';
import ErrorBoundary from './components/ErrorBoundary';

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

// Superadmin — separate auth context and layout
const SuperadminLogin    = lazy(() => import('./components/superadmin/SuperadminLogin'));
const SuperadminLayout   = lazy(() => import('./components/superadmin/SuperadminLayout'));
const SuperadminDashboard = lazy(() => import('./components/superadmin/SuperadminDashboard'));
const OrgList            = lazy(() => import('./components/superadmin/OrgList'));
const OrgDetail          = lazy(() => import('./components/superadmin/OrgDetail'));

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRootRoute() {
  const { user, loading } = useAuth();
  const { brand, loading: brandLoading } = useTenantBrand();
  // Wait for both lookups so a white-label domain never flashes the landing page.
  if (loading || brandLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (user) return <Navigate to="/accounts" replace />;
  // On a custom org domain, go straight to the branded login — no landing page.
  return brand ? <Login /> : <LandingPage />;
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

function SuperadminRoute({ children }) {
  const { admin, loading } = useSuperadminAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  return admin ? children : <Navigate to="/superadmin/login" replace />;
}

// Impersonation entry: reads ?token= from URL, stores it, then does a FULL
// reload (not client-side navigation) so AuthContext re-initializes and
// fetches /api/auth/me with the impersonation token. Without the reload the
// app keeps whatever session was already loaded, so the support view would
// show stale features/theme instead of the org member's real view.
function ImpersonationEntry() {
  const [params] = useSearchParams();

  useEffect(() => {
    const token = params.get('token');
    if (token) {
      localStorage.setItem('token', token);
      window.location.replace('/accounts');
    } else {
      window.location.replace('/');
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
    <Routes>
      {/* Public landing page at root */}
      <Route path="/" element={<PublicRootRoute />} />

      <Route path="/login" element={user ? <Navigate to="/accounts" replace /> : <Login />} />

      {/* Impersonation entry point — stores the short-lived token then redirects to / */}
      <Route path="/superadmin/enter" element={<ImpersonationEntry />} />

      {/* Superadmin section — completely separate auth */}
      <Route path="/superadmin/login" element={<SuperadminLogin />} />
      <Route path="/superadmin" element={<SuperadminRoute><SuperadminLayout /></SuperadminRoute>}>
        <Route index element={<SuperadminDashboard />} />
        <Route path="orgs" element={<OrgList />} />
        <Route path="orgs/:id" element={<OrgDetail />} />
      </Route>

      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="dashboard" element={<Dashboard />} />
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
    </Suspense>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <TenantBrandProvider>
      <SuperadminAuthProvider>
        <AuthProvider>
          <FieldLabelsProvider>
            <PermissionsProvider>
              <AiConfigProvider>
                <AppRoutes />
              </AiConfigProvider>
            </PermissionsProvider>
          </FieldLabelsProvider>
        </AuthProvider>
      </SuperadminAuthProvider>
      </TenantBrandProvider>
    </ErrorBoundary>
  );
}
