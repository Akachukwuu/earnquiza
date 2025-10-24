import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Auth } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { Deposit } from './pages/Deposit';
import { Withdraw } from './pages/Withdraw';
import { AdminPanel } from './pages/AdminPanel';

type Page = 'dashboard' | 'deposit' | 'withdraw' | 'admin';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  switch (currentPage) {
    case 'deposit':
      return <Deposit onBack={() => setCurrentPage('dashboard')} />;
    case 'withdraw':
      return <Withdraw onBack={() => setCurrentPage('dashboard')} />;
    case 'admin':
      return <AdminPanel onBack={() => setCurrentPage('dashboard')} />;
    default:
      return <Dashboard onNavigate={setCurrentPage} />;
  }
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
