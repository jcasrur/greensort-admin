import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AdminLogin from './AdminLogin'; // 👈 Bagong file
import Dashboard from './Dashboard';
import DropOffNodes from './DropOffNodes';
import UpcycleManagement from './UpcycleManagement';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 🟢 Login muna ang bubungad */}
        <Route path="/" element={<AdminLogin />} />
        
        {/* 🟢 Ibang mga pages */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dropoff" element={<DropOffNodes />} />
        <Route path="/upcycle" element={<UpcycleManagement />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;