import React, { useState } from 'react';
import { useProject } from '../../services/projectService';
import { useTranslation } from '../../services/translationService';

export const WelcomeDialog: React.FC = () => {
  const { createProject, loadProject } = useProject();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'new' | 'open'>('new');
  const [projectName, setProjectName] = useState('New Project');
  const [projectPath, setProjectPath] = useState('/Users/ComicFlow/Documents');

  const handleCreate = () => {
    if (projectName.trim()) {
      createProject(projectName);
    }
  };

  const handleOpen = () => {
    // In web, we can trigger a file input click, but for this UI demo we'll just simulate success
    loadProject();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-[800px] h-[500px] bg-gray-900 rounded-xl shadow-2xl border border-gray-800 flex overflow-hidden">
        
        {/* Left Sidebar: Recent Projects */}
        <div className="w-1/3 bg-gray-950 border-r border-gray-800 flex flex-col">
          <div className="p-6 border-b border-gray-800">
             <div className="w-10 h-10 bg-brand-orange rounded-lg flex items-center justify-center font-bold text-white text-xl mb-3">
               C
             </div>
             <h1 className="text-xl font-bold text-gray-100">{t('welcome_title')}</h1>
          </div>
          <div className="p-4 flex-1 overflow-y-auto">
             <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">{t('recent_projects')}</h3>
             <div className="text-sm text-gray-600 italic px-2">
               {t('no_recent_projects')}
             </div>
             {/* Mock Items for visual feel */}
             {/* 
             <div className="p-2 hover:bg-gray-800 rounded cursor-pointer mb-1">
                <div className="text-gray-300 font-medium">Cyberpunk 2099</div>
                <div className="text-xs text-gray-600">Modified 2h ago</div>
             </div> 
             */}
          </div>
        </div>

        {/* Right Content: Actions */}
        <div className="w-2/3 flex flex-col">
           {/* Tabs */}
           <div className="flex border-b border-gray-800">
              <button 
                onClick={() => setActiveTab('new')}
                className={`flex-1 py-4 text-sm font-medium transition ${activeTab === 'new' ? 'text-brand-orange border-b-2 border-brand-orange bg-gray-800/50' : 'text-gray-400 hover:text-gray-200'}`}
              >
                {t('btn_new_project')}
              </button>
              <button 
                onClick={() => setActiveTab('open')}
                className={`flex-1 py-4 text-sm font-medium transition ${activeTab === 'open' ? 'text-brand-orange border-b-2 border-brand-orange bg-gray-800/50' : 'text-gray-400 hover:text-gray-200'}`}
              >
                {t('btn_open_project')}
              </button>
           </div>

           {/* Content */}
           <div className="flex-1 p-8 flex flex-col">
             {activeTab === 'new' ? (
               <div className="space-y-6">
                 <div>
                    <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">{t('lbl_proj_name')}</label>
                    <input 
                      type="text" 
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white focus:border-brand-orange outline-none transition"
                      autoFocus
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">{t('lbl_proj_path')}</label>
                    <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={projectPath}
                          readOnly
                          className="flex-1 bg-gray-950 border border-gray-700 rounded-lg p-3 text-gray-500 cursor-not-allowed outline-none"
                        />
                        <button className="px-4 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-700 text-sm">
                           ...
                        </button>
                    </div>
                 </div>
                 <div className="pt-8 flex justify-end">
                    <button 
                      onClick={handleCreate}
                      className="px-8 py-3 bg-brand-orange text-white font-bold rounded-lg shadow-lg shadow-orange-900/20 hover:bg-orange-600 transition transform hover:scale-105"
                    >
                       {t('create')}
                    </button>
                 </div>
               </div>
             ) : (
               <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                  <div className="p-4 bg-gray-800 rounded-full">
                     <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                     </svg>
                  </div>
                  <p className="text-gray-400 max-w-xs">{t('select_location')}</p>
                  <button 
                    onClick={handleOpen}
                    className="px-8 py-3 bg-brand-blue text-white font-bold rounded-lg shadow-lg hover:bg-blue-600 transition"
                  >
                    {t('btn_open_project')}
                  </button>
               </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
};