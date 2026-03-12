import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AdminLogin from './AdminLogin'; 
import Dashboard from './Dashboard';
import DropOffNodes from './DropOffNodes';
import UpcycleManagement from './UpcycleManagement';
import UserManagement from './UserManagement'; 
import ContentModeration from './ContentModeration'; // 🟢 IN-ADD NATIN ITO

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AdminLogin />} />
        
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/users" element={<UserManagement />} /> 
        <Route path="/moderation" element={<ContentModeration />} /> {/* 🟢 IN-ADD NATIN ITO */}
        <Route path="/dropoff" element={<DropOffNodes />} />
        <Route path="/upcycle" element={<UpcycleManagement />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;