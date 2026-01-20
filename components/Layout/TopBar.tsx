import React, { useState, useEffect, useRef } from 'react';
import { useProject } from '../../services/projectService';
import { useTranslation } from '../../services/translationService';
import { useAuth } from '../../services/authService';
import { AspectRatio } from '../../types';

export const TopBar: React.FC = () => {
  const { project, updateProjectSettings, saveProject, closeProject } = useProject();
  const { t, toggleLanguage, language } = useTranslation();
  const { logout } = useAuth();
  
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(project.apiKey || '');
  const [showSaveMsg, setShowSaveMsg] = useState(false);
  
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      if (isCtrlOrCmd) {
        switch (e.key.toLowerCase()) {
          case 's':
            e.preventDefault();
            handleSaveProject();
            break;
          case 'n':
            e.preventDefault();
            closeProject(); // Return to Welcome (New)
            break;
          case 'o':
            e.preventDefault();
            closeProject(); // Return to Welcome (Open)
            break;
          case 'q':
            e.preventDefault();
            logout();
            break;
          case ',':
            e.preventDefault();
            setIsSettingsOpen(true);
            break;
          case 'z':
             e.preventDefault();
             if (e.shiftKey) {
                 console.log("Redo triggered");
             } else {
                 console.log("Undo triggered");
             }
             break;
        }
      }
      
      // Fullscreen
      if (e.key === 'F11') {
          e.preventDefault();
          toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSaveSettings = () => {
    updateProjectSettings({ 
      apiKey: apiKeyInput,
    });
    setIsSettingsOpen(false);
  };
  
  const handleSaveProject = () => {
    saveProject();
    setShowSaveMsg(true);
    setTimeout(() => setShowSaveMsg(false), 2000);
    setActiveMenu(null);
  };

  const handleNewProject = () => {
    closeProject();
    setActiveMenu(null);
  };

  const handleOpenProject = () => {
      closeProject();
      setActiveMenu(null);
  };

  const handleExit = () => {
      logout();
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch((e) => console.log(e));
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
    setActiveMenu(null);
  };

  const handleMenuClick = (menu: string) => {
      setActiveMenu(activeMenu === menu ? null : menu);
  };

  return (
    <div className="h-10 bg-gray-950 border-b border-gray-800 flex items-center justify-between px-3 shrink-0 select-none z-40 relative">
      <div className="flex items-center gap-4 h-full" ref={menuRef}>
        {/* Logo/Icon */}
        <div className="w-6 h-6 bg-brand-orange rounded flex items-center justify-center font-bold text-white text-sm shadow-sm">
          C
        </div>

        {/* Menu Bar */}
        <div className="flex h-full items-center">
            {/* File Menu */}
            <div className="relative">
                <button 
                    onClick={() => handleMenuClick('file')}
                    className={`px-3 py-1 text-xs text-gray-300 hover:bg-gray-800 rounded transition-colors ${activeMenu === 'file' ? 'bg-gray-800 text-white' : ''}`}
                >
                    {t('menu_file')}
                </button>
                {activeMenu === 'file' && (
                    <div className="absolute top-full left-0 w-56 bg-gray-900 border border-gray-700 rounded-md shadow-xl py-1 z-50 mt-1">
                        <MenuItem label={t('act_new')} shortcut="Ctrl+N" onClick={handleNewProject} />
                        <MenuItem label={t('act_open')} shortcut="Ctrl+O" onClick={handleOpenProject} />
                        <MenuItem label={t('act_save')} shortcut="Ctrl+S" onClick={handleSaveProject} />
                        <div className="h-px bg-gray-800 my-1 mx-2"></div>
                        <MenuItem label={t('act_settings')} shortcut="Ctrl+," onClick={() => { setIsSettingsOpen(true); setActiveMenu(null); }} />
                        <div className="h-px bg-gray-800 my-1 mx-2"></div>
                        <MenuItem label={t('act_exit')} shortcut="Ctrl+Q" onClick={handleExit} />
                    </div>
                )}
            </div>

            {/* Edit Menu */}
            <div className="relative">
                <button 
                    onClick={() => handleMenuClick('edit')}
                    className={`px-3 py-1 text-xs text-gray-300 hover:bg-gray-800 rounded transition-colors ${activeMenu === 'edit' ? 'bg-gray-800 text-white' : ''}`}
                >
                    {t('menu_edit')}
                </button>
                {activeMenu === 'edit' && (
                    <div className="absolute top-full left-0 w-56 bg-gray-900 border border-gray-700 rounded-md shadow-xl py-1 z-50 mt-1">
                        <MenuItem label={t('act_undo')} shortcut="Ctrl+Z" onClick={() => console.log('Undo')} />
                        <MenuItem label={t('act_redo')} shortcut="Ctrl+Shift+Z" onClick={() => console.log('Redo')} />
                        <div className="h-px bg-gray-800 my-1 mx-2"></div>
                        <MenuItem label={t('act_cut')} shortcut="Ctrl+X" onClick={() => console.log('Cut')} />
                        <MenuItem label={t('act_copy')} shortcut="Ctrl+C" onClick={() => console.log('Copy')} />
                        <MenuItem label={t('act_paste')} shortcut="Ctrl+V" onClick={() => console.log('Paste')} />
                    </div>
                )}
            </div>

             {/* View Menu */}
             <div className="relative">
                <button 
                    onClick={() => handleMenuClick('view')}
                    className={`px-3 py-1 text-xs text-gray-300 hover:bg-gray-800 rounded transition-colors ${activeMenu === 'view' ? 'bg-gray-800 text-white' : ''}`}
                >
                    {t('menu_view')}
                </button>
                {activeMenu === 'view' && (
                    <div className="absolute top-full left-0 w-56 bg-gray-900 border border-gray-700 rounded-md shadow-xl py-1 z-50 mt-1">
                        <MenuItem label={t('act_fullscreen')} shortcut="F11" onClick={toggleFullscreen} />
                        <MenuItem label={t('act_lang')} onClick={() => { toggleLanguage(); setActiveMenu(null); }} />
                    </div>
                )}
            </div>

             {/* Help Menu */}
             <div className="relative">
                <button 
                    onClick={() => handleMenuClick('help')}
                    className={`px-3 py-1 text-xs text-gray-300 hover:bg-gray-800 rounded transition-colors ${activeMenu === 'help' ? 'bg-gray-800 text-white' : ''}`}
                >
                    {t('menu_help')}
                </button>
                {activeMenu === 'help' && (
                    <div className="absolute top-full left-0 w-56 bg-gray-900 border border-gray-700 rounded-md shadow-xl py-1 z-50 mt-1">
                        <MenuItem label={t('act_about')} onClick={() => { setIsAboutOpen(true); setActiveMenu(null); }} />
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* Right Side: Quick Actions */}
      <div className="flex items-center gap-3">
         <span className="text-[10px] text-gray-500 font-mono border border-gray-800 px-2 py-0.5 rounded bg-gray-900">
             {project.name}
         </span>
         <div className="h-4 w-px bg-gray-800"></div>
         <select 
            value={project.aspectRatio}
            onChange={(e) => updateProjectSettings({ aspectRatio: e.target.value as AspectRatio })}
            className="bg-transparent text-[10px] text-gray-400 outline-none border-none cursor-pointer hover:text-gray-200"
          >
            <option value={AspectRatio.RATIO_16_9}>16:9</option>
            <option value={AspectRatio.RATIO_9_16}>9:16</option>
            <option value={AspectRatio.RATIO_235_1}>2.35:1</option>
          </select>
          
          {showSaveMsg && <span className="text-[10px] text-brand-blue animate-pulse">{t('msg_save_success')}</span>}
      </div>

      {/* Modals */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
           <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl p-6 w-96">
                <h3 className="text-sm font-bold text-white mb-4">{t('global_settings')}</h3>
                <div className="mb-6">
                    <label className="block text-xs text-gray-400 mb-2">{t('api_key_label')}</label>
                    <input 
                    type="password" 
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="sk-..."
                    className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-xs text-white focus:border-brand-orange outline-none"
                    autoFocus
                    />
                </div>
                <div className="flex justify-end gap-2">
                    <button 
                    onClick={() => setIsSettingsOpen(false)}
                    className="px-4 py-2 text-xs text-gray-400 hover:text-white"
                    >
                    {t('cancel')}
                    </button>
                    <button 
                    onClick={handleSaveSettings}
                    className="px-4 py-2 bg-brand-orange text-white text-xs rounded hover:bg-orange-600 font-bold"
                    >
                    {t('save')}
                    </button>
                </div>
           </div>
        </div>
      )}

      {isAboutOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl p-6 w-80 text-center">
                 <div className="w-12 h-12 bg-brand-orange rounded-lg flex items-center justify-center font-bold text-white text-2xl mx-auto mb-4 shadow-lg shadow-orange-900/40">
                    C
                 </div>
                 <h3 className="text-lg font-bold text-white mb-1">{t('about_title')}</h3>
                 <p className="text-xs text-gray-500 mb-2">{t('about_version')}</p>
                 <p className="text-sm text-gray-400 mb-6">{t('about_desc')}</p>
                 <button 
                    onClick={() => setIsAboutOpen(false)}
                    className="w-full py-2 bg-gray-800 text-gray-300 text-xs rounded hover:bg-gray-700 border border-gray-700"
                 >
                    {t('close')}
                 </button>
            </div>
          </div>
      )}

    </div>
  );
};

const MenuItem: React.FC<{ label: string, shortcut?: string, onClick: () => void }> = ({ label, shortcut, onClick }) => (
    <div 
        onClick={onClick}
        className="px-4 py-1.5 flex justify-between items-center hover:bg-brand-blue hover:text-white cursor-pointer group text-gray-300"
    >
        <span className="text-xs">{label}</span>
        {shortcut && <span className="text-[10px] text-gray-500 group-hover:text-blue-100">{shortcut}</span>}
    </div>
);