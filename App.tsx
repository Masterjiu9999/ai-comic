import React from 'react';
import { ProjectProvider, useProject } from './services/projectService';
import { LanguageProvider } from './services/translationService';
import { AuthProvider, useAuth } from './services/authService';
import { TaskProvider } from './services/taskContext';
import { MainLayout } from './components/Layout/MainLayout';
import { WelcomeDialog } from './components/Dialogs/WelcomeDialog';
import { LoginDialog } from './components/Dialogs/LoginDialog';

const AppContent: React.FC = () => {
  const { currentUser } = useAuth();
  const { isLoaded } = useProject();
  
  if (!currentUser) {
    return <LoginDialog />;
  }

  return (
    <>
      {!isLoaded && <WelcomeDialog />}
      {isLoaded && <MainLayout />}
    </>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AuthProvider>
        <TaskProvider>
          <ProjectProvider>
            <AppContent />
          </ProjectProvider>
        </TaskProvider>
      </AuthProvider>
    </LanguageProvider>
  );
};

export default App;