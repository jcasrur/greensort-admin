import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './ThemeContext';
import { ToastProvider } from './Toast';
import { ConfirmProvider } from './ConfirmModal';

import AdminLogin        from './AdminLogin';
import Dashboard         from './Dashboard';
import DropOffNodes      from './DropOffNodes';
import UserManagement    from './UserManagement';
import ContentModeration from './ContentModeration';
import PresenceTracker   from './PresenceTracker';
import AdminAccess       from './AdminAccess';
import MFAEnrollment     from './MFAEnrollment';
import SurrenderLogs     from './SurrenderLogs';

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ConfirmProvider>
          <BrowserRouter>
            <PresenceTracker />
            <Routes>
              {/* ── Public ── */}
              <Route path="/"          element={<AdminLogin />} />
              <Route path="/setup-mfa" element={<MFAEnrollment />} />

              {/* ── Protected ── */}
              <Route path="/dashboard"  element={<Dashboard />} />
              <Route path="/users"      element={<UserManagement />} />
              <Route path="/moderation" element={<ContentModeration />} />
              <Route path="/dropoff"    element={<DropOffNodes />} />
              <Route path="/access"         element={<AdminAccess />} />
              <Route path="/surrender-logs"  element={<SurrenderLogs />} />

              {/* ── Catch-all ── */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ConfirmProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;