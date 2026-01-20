import React from 'react';
import { useProject } from '../../services/projectService';
import { useTranslation } from '../../services/translationService';
import { WorkflowTab } from '../../types';

export const BottomNav: React.FC = () => {
  const { currentTab, setTab } = useProject();
  const { t } = useTranslation();

  const tabs = [
    { id: WorkflowTab.PLANNING, label: t('tab_planning'), icon: '🧠' },
    { id: WorkflowTab.CAST, label: t('tab_cast'), icon: '👥' },
    { id: WorkflowTab.SCRIPTING, label: t('tab_scripting'), icon: '📝' },
    { id: WorkflowTab.VISUALIZING, label: t('tab_visualizing'), icon: '🖼️' },
    { id: WorkflowTab.DELIVER, label: t('tab_deliver'), icon: '🚀' },
  ];

  return (
    <div className="h-14 bg-gray-950 border-t border-gray-800 flex items-center justify-center px-4 shrink-0">
      <div className="flex space-x-1 bg-gray-900 p-1 rounded-lg">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`
                px-6 py-2 rounded-md text-sm font-bold transition-all duration-200 flex items-center gap-2
                ${isActive 
                  ? 'bg-brand-orange text-white shadow-lg shadow-orange-900/20 scale-105' 
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                }
              `}
            >
              <span className="text-lg">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};