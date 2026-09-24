import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/MainLayout';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { POSPage } from './features/pos/POSPage';

function App() {
  return (
    <Router>
      <MainLayout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/pos" element={<POSPage />} />
          <Route path="/orders" element={<div className="text-center py-12">Pedidos - En desarrollo</div>} />
          <Route path="/inventory" element={<div className="text-center py-12">Inventario - En desarrollo</div>} />
          <Route path="/customers" element={<div className="text-center py-12">Clientes - En desarrollo</div>} />
          <Route path="/cash" element={<div className="text-center py-12">Caja - En desarrollo</div>} />
          <Route path="/reports" element={<div className="text-center py-12">Reportes - En desarrollo</div>} />
          <Route path="/settings" element={<div className="text-center py-12">Configuración - En desarrollo</div>} />
        </Routes>
      </MainLayout>
    </Router>
  );
}

export default App;
