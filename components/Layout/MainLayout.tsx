import React from 'react';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { useProject } from '../../services/projectService';
import { useTranslation } from '../../services/translationService';
import { WorkflowTab } from '../../types';
import { TaskMonitor } from '../UI/TaskMonitor';

// Modules
import { ScriptModule } from '../Modules/ScriptModule';
import { CharacterModule } from '../Modules/CharacterModule';
import { StoryboardModule } from '../Modules/StoryboardModule';
import { DeliverModule } from '../Modules/DeliverModule';

export const MainLayout: React.FC = () => {
  const { currentTab, selectedEpisodeId } = useProject();
  const { t } = useTranslation();

  const renderModule = () => {
    // Stage 2 (Cast) is generally global, but can be viewed at any time.
    // Scripting/Visualizing requires an Episode Context.

    if (selectedEpisodeId === null && (currentTab === WorkflowTab.SCRIPTING || currentTab === WorkflowTab.VISUALIZING)) {
        return (
            <div className="h-full flex items-center justify-center flex-col text-gray-500">
                <span className="text-4xl mb-4">👈</span>
                <p>Please select an Episode from the Project Explorer to begin.</p>
            </div>
        );
    }

    switch (currentTab) {
      case WorkflowTab.PLANNING: 
          // Planning Mode: Bible & Breakdown
          return <ScriptModule mode="planning" />;
      
      case WorkflowTab.CAST:
          // Cast Mode: Character Profile Cards
          return <CharacterModule />;
      
      case WorkflowTab.SCRIPTING: 
          // Scripting Mode: Table Editor + Audio
          return <ScriptModule mode="scripting" />;
      
      case WorkflowTab.VISUALIZING: 
          // Visualizing Mode: Gallery
          return <StoryboardModule />;
      
      case WorkflowTab.DELIVER: 
          return <DeliverModule />;
      
      default: 
          return <ScriptModule mode="planning" />;
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-gray-950 overflow-hidden relative">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 bg-gray-950 relative">
             {/* Workspace Area */}
             <div className="flex-1 overflow-hidden relative z-0">
                {renderModule()}
             </div>
        </div>
      </div>
      <BottomNav />
      {/* Task Monitor Widget (Always on top) */}
      <TaskMonitor />
    </div>
  );
};