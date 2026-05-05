import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import { ShiftProvider } from './context/ShiftContext';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

// Pages
import Dashboard from './pages/Dashboard';
import CalendarPage from './pages/Calendar';
import Notifications from './pages/Notifications';
import Registration from './pages/Registration';
import Payroll from './pages/Payroll';
import AIAssistant from './pages/AIAssistant';
import EmployeeProfile from './pages/EmployeeProfile';
import EmployeeManagement from './pages/EmployeeManagement';
import ShiftManagement from './pages/ShiftManagement';
import Settings from './pages/Settings';
import Login from './pages/Login';
import QRScanner from './pages/QRScanner';

export default function App() {
  return (
    <AuthProvider>
      <ShiftProvider>
        <Router>
          <Routes>
            {/* Public route */}
            <Route path="/login" element={<Login />} />
            
            {/* Protected routes */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/calendar" element={<CalendarPage />} />
                      <Route path="/notifications" element={<Notifications />} />
                      <Route path="/registration" element={<Registration />} />
                      
                      {/* Admin/Manager only routes */}
                      <Route 
                        path="/payroll" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'manager']}>
                            <Payroll />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/ai-assistant" 
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'manager']}>
                            <AIAssistant />
                          </ProtectedRoute>
                        } 
                      />
                      <Route
                        path="/employees"
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'manager']}>
                            <EmployeeManagement />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/shift-management"
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'manager']}>
                            <ShiftManagement />
                          </ProtectedRoute>
                        }
                      />
                      
                      <Route path="/profile/:id" element={<EmployeeProfile />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/qr-scanner" element={<QRScanner />} />
                    </Routes>
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </ShiftProvider>
    </AuthProvider>
  );
}
