import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AdminLogin from './AdminLogin'; 
import Dashboard from './Dashboard';
import DropOffNodes from './DropOffNodes';
import UpcycleManagement from './UpcycleManagement';
import UserManagement from './UserManagement'; 
import ContentModeration from './ContentModeration';
import PresenceTracker from './PresenceTracker';
import { ThemeProvider } from './ThemeContext'; // 🟢 1. I-import ang Provider

function App() {
  return (
    <ThemeProvider> {/* 🟢 2. I-wrap ang buong app dito */}
      <BrowserRouter>
        <PresenceTracker />
        <Routes>
          <Route path="/" element={<AdminLogin />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/users" element={<UserManagement />} /> 
          <Route path="/moderation" element={<ContentModeration />} /> 
          {/* Siguraduhin na ang path dito ay /dropoff at /upcycle */}
          <Route path="/dropoff" element={<DropOffNodes />} />
          <Route path="/upcycle" element={<UpcycleManagement />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;