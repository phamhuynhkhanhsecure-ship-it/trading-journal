
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { SettingsProvider } from './context/SettingsContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout/Layout';
import Calendar from './components/Calendar/Calendar';
import Rules from './components/Rules/Rules';
import Gallery from './components/Gallery/Gallery';
import Analytics from './components/Analytics/Analytics';
import Journal from './components/Journal/Journal';
import Tags from './components/Tags/Tags';
import PlaybookPage from './components/Playbook/Playbook';
import Calculator from './components/Calculator/Calculator';
import Login from './components/Login/Login';
import UserManagement from './pages/Admin/UserManagement';
import Pricing from './pages/Pricing/Pricing';


const AppContent = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Calendar />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="journal" element={<Journal />} />
          <Route path="playbook" element={<PlaybookPage />} />
          <Route path="rules" element={<Rules />} />
          <Route path="tags" element={<Tags />} />
          <Route path="gallery" element={<Gallery />} />
          <Route path="calculator" element={<Calculator />} />
          <Route path="admin/users" element={<UserManagement />} />
          <Route path="pricing" element={<Pricing />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}
