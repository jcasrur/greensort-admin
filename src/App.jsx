import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider }  from './ThemeContext';
import { ToastProvider }  from './Toast';
import { ConfirmProvider } from './ConfirmModal';
import ErrorBoundary      from './ErrorBoundary';

import AcceptInvite from './AcceptInvite';
import AdminLogin        from './AdminLogin';
import ResetPassword from './ResetPassword';
import Dashboard         from './Dashboard';
import AdminRewards      from './AdminRewards';
import UserManagement    from './UserManagement';
import ContentModeration from './ContentModeration';
import PresenceTracker   from './PresenceTracker';
import AdminAccess       from './AdminAccess';
import MFAEnrollment     from './MFAEnrollment';
import SurrenderLogs     from './SurrenderLogs';
import Unauthorized      from './Unauthorized';
import ProtectedRoute    from './ProtectedRoute';
import StudentsRecord    from './StudentsRecord';
import AccountingRecords from './AccountingRecords';

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ConfirmProvider>
          <BrowserRouter>
            <PresenceTracker />
            <ErrorBoundary>
              <Routes>
                <Route path="/accept-invite" element={<AcceptInvite />} />
                <Route path="/"             element={<AdminLogin />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/setup-mfa"    element={<MFAEnrollment />} />
                <Route path="/unauthorized" element={<Unauthorized />} />

                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>}/>
                <Route path="/students"  element={<ProtectedRoute module="students"><StudentsRecord /></ProtectedRoute>}/>
                <Route path="/accounting" element={<ProtectedRoute module="accounting"><AccountingRecords /></ProtectedRoute>}/>
                <Route path="/surrender-logs" element={<ProtectedRoute><SurrenderLogs /></ProtectedRoute>}/>
                <Route path="/fund-dashboard" element={<ProtectedRoute module="fund_dashboard"><AdminRewards /></ProtectedRoute>}/>
                <Route path="/admin-rewards"  element={<Navigate to="/fund-dashboard" replace />} />
                <Route path="/users"      element={<ProtectedRoute module="user_management"><UserManagement /></ProtectedRoute>}/>
                <Route path="/moderation" element={<ProtectedRoute module="messages"><ContentModeration /></ProtectedRoute>}/>
                <Route path="/reports"    element={<ProtectedRoute module="reports"><Dashboard /></ProtectedRoute>}/>
                <Route path="/access"     element={<ProtectedRoute module="super_admin_panel"><AdminAccess /></ProtectedRoute>}/>
                <Route path="*"           element={<Navigate to="/" replace />} />
              </Routes>
            </ErrorBoundary>
          </BrowserRouter>
        </ConfirmProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
