import React from 'react';
import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import LoginPage from './components/LoginPage';
import MainDashboard from './components/MainDashboard';
import TrainingPage from './components/TrainingPage';
import PromptManagementPage from './components/PromptManagementPage';
import SettingsPage from './components/SettingsPage';
import ScriptGenerationPage from './components/ScriptGenerationPage';

export type PageType = 'dashboard' | 'training' | 'prompts' | 'settings' | 'generate';

function App() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');

  useEffect(() => {
    // Check for existing Supabase session
    const checkSession = async () => {
      setIsLoading(true);
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          // Clear stale authentication data if refresh token is invalid
          console.log('Session error, signing out:', error.message);
          await supabase.auth.signOut();
          setUser(null);
        } else if (session?.user) {
          setUser(session.user);
        }
      } catch (error) {
        console.error('Error checking session:', error);
        // Clear any stale auth data on error
        await supabase.auth.signOut();
        setUser(null);
      }
      setIsLoading(false);
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        if (session?.user) {
          setUser(session.user);
        } else {
          setUser(null);
        }
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = (userData: any) => {
    console.log('Login successful:', userData?.email);
    setUser(userData);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentPage('dashboard');
  };

  const navigateToPage = (page: PageType) => {
    setCurrentPage(page);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const renderCurrentPage = () => {
    console.log('Current page:', currentPage);
    switch (currentPage) {
      case 'dashboard':
        return (
          <MainDashboard 
            user={user} 
            onLogout={handleLogout}
            onNavigate={navigateToPage}
          />
        );
      case 'training':
        return (
          <TrainingPage 
            user={user} 
            onBack={() => setCurrentPage('dashboard')}
            onNavigate={navigateToPage}
          />
        );
      case 'prompts':
        return (
          <PromptManagementPage 
            user={user} 
            onBack={() => setCurrentPage('dashboard')}
            onNavigate={navigateToPage}
          />
        );
      case 'settings':
        return (
          <SettingsPage 
            user={user} 
            onBack={() => setCurrentPage('dashboard')}
            onNavigate={navigateToPage}
          />
        );
      case 'generate':
        console.log('Rendering ScriptGenerationPage');
        return (
          <ScriptGenerationPage 
            user={user} 
            onBack={() => setCurrentPage('dashboard')}
            onNavigate={navigateToPage}
          />
        );
      default:
        console.log('Default case, rendering MainDashboard');
        return (
          <MainDashboard 
            user={user} 
            onLogout={handleLogout}
            onNavigate={navigateToPage}
          />
        );
    }
  };

  return renderCurrentPage();
}

export default App;