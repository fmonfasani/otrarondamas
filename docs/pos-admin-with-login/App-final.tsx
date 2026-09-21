import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/MainLayout';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { POSPage } from './features/pos/POSPage';
import { LoginPage } from './features/login/LoginPage';

function App() {
  const isLoggedIn = localStorage.getItem('isLoggedIn');

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        {isLoggedIn ? (
          <>
            <Route path="/" element={<MainLayout><DashboardPage /></MainLayout>} />
            <Route path="/pos" element={<MainLayout><POSPage /></MainLayout>} />
            <Route path="/orders" element={<MainLayout><div className="text-center py-12">Pedidos - En desarrollo</div></MainLayout>} />
            <Route path="/inventory" element={<MainLayout><div className="text-center py-12">Inventario - En desarrollo</div></MainLayout>} />
            <Route path="/customers" element={<MainLayout><div className="text-center py-12">Clientes - En desarrollo</div></MainLayout>} />
            <Route path="/cash" element={<MainLayout><div className="text-center py-12">Caja - En desarrollo</div></MainLayout>} />
            <Route path="/reports" element={<MainLayout><div className="text-center py-12">Reportes - En desarrollo</div></MainLayout>} />
            <Route path="/settings" element={<MainLayout><div className="text-center py-12">Configuración - En desarrollo</div></MainLayout>} />
          </>
        ) : (
          <Route path="*" element={<Navigate to="/login" />} />
        )}
      </Routes>
    </Router>
  );
}

export default App;
