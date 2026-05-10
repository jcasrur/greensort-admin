import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AdminLogin from './AdminLogin';
import Dashboard from './Dashboard';
import DropOffNodes from './DropOffNodes';
import UpcycleManagement from './UpcycleManagement';
import UserManagement from './UserManagement';
import ContentModeration from './ContentModeration';
import PresenceTracker from './PresenceTracker';
import AdminAccess from './AdminAccess';
import SurrenderLogs from './SurrenderLogs';
import { ThemeProvider } from './ThemeContext';
import ErrorBoundary from './ErrorBoundary'; // 🟢 Prevents full white screen on crashes

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <PresenceTracker />
        {/* ErrorBoundary catches any render crash in any route and shows a readable error instead of a white screen */}
        <ErrorBoundary>
          <Routes>
            <Route path="/"            element={<AdminLogin />} />
            <Route path="/dashboard"   element={<Dashboard />} />
            <Route path="/users"       element={<UserManagement />} />
            <Route path="/moderation"  element={<ContentModeration />} />
            <Route path="/dropoff"     element={<DropOffNodes />} />
            <Route path="/upcycle"     element={<UpcycleManagement />} />
            <Route path="/access"      element={<AdminAccess />} />
            <Route path="/logs"          element={<SurrenderLogs />} />
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;