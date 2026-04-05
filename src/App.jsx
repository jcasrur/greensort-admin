import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AdminLogin from './AdminLogin'; 
import Dashboard from './Dashboard';
import DropOffNodes from './DropOffNodes';
import UpcycleManagement from './UpcycleManagement';
import UserManagement from './UserManagement'; 
import ContentModeration from './ContentModeration';
import PresenceTracker from './PresenceTracker'; // 🟢 1. IN-IMPORT NATIN DITO YUNG TRACKER

function App() {
  return (
    <BrowserRouter>
      
      {/* 🟢 2. NILAGAY NATIN DITO PARA TUMAKBO SA BACKGROUND KAHIT LUMIPAT-LIPAT NG PAGE */}
      <PresenceTracker />

      <Routes>
        <Route path="/" element={<AdminLogin />} />
        
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/users" element={<UserManagement />} /> 
        <Route path="/moderation" element={<ContentModeration />} /> 
        <Route path="/dropoff" element={<DropOffNodes />} />
        <Route path="/upcycle" element={<UpcycleManagement />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;