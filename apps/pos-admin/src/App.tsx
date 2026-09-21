import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthContext';
import { LoginPage } from './features/auth/LoginPage';
import { GoogleCallbackPage } from './features/auth/GoogleCallbackPage';
import { ProtectedRoute } from './features/auth/ProtectedRoute';
import { MainLayout } from './components/MainLayout';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { NuevaVentaPage } from './features/ventas/NuevaVentaPage';
import { CajaPage } from './features/caja/CajaPage';
import { ProfilePage } from './features/profile/ProfilePage';
import { InventarioPage } from './features/inventario/InventarioPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Routes>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/ventas/nueva" element={<NuevaVentaPage />} />
                    <Route
                      path="/orders"
                      element={<div className="text-center py-12">Pedidos - En desarrollo</div>}
                    />
                    <Route path="/inventory" element={<InventarioPage />} />
                    <Route
                      path="/customers"
                      element={<div className="text-center py-12">Clientes - En desarrollo</div>}
                    />
                    <Route path="/cash" element={<CajaPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route
                      path="/reports"
                      element={<div className="text-center py-12">Reportes - En desarrollo</div>}
                    />
                    <Route
                      path="/settings"
                      element={
                        <div className="text-center py-12">Configuración - En desarrollo</div>
                      }
                    />
                  </Routes>
                </MainLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
