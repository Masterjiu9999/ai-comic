import React, { useState } from 'react';
import { useAuth } from '../../services/authService';
import { useTranslation } from '../../services/translationService';

export const LoginDialog: React.FC = () => {
  const { login, register, debugLogin } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
  // Form States
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    try {
        if (activeTab === 'login') {
          const success = await login(username, password);
          if (!success) {
            setError(t('msg_login_fail'));
          }
        } else {
          const result = await register(username, password, apiKey);
          if (result.success) {
            // Auto login after register
            await login(username, password);
          } else {
            setError(result.message || t('msg_user_exists'));
          }
        }
    } catch (err) {
        setError("An unexpected error occurred.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleDebugLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
        await debugLogin();
    } catch (err) {
        setError("Debug login failed.");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md">
      <div className="w-[400px] bg-gray-900 rounded-xl shadow-2xl border border-gray-800 overflow-hidden">
        
        {/* Header */}
        <div className="bg-gray-950 p-6 flex flex-col items-center border-b border-gray-800">
          <div className="w-12 h-12 bg-brand-orange rounded-lg flex items-center justify-center font-bold text-white text-2xl mb-3 shadow-lg shadow-orange-900/40">
            C
          </div>
          <h2 className="text-lg font-bold text-gray-200">{t('title_login')}</h2>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800">
           <button 
             onClick={() => { setActiveTab('login'); setError(null); }}
             className={`flex-1 py-3 text-sm font-medium transition ${activeTab === 'login' ? 'text-brand-orange border-b-2 border-brand-orange bg-gray-800/30' : 'text-gray-500 hover:text-gray-300'}`}
           >
             {t('login_tab')}
           </button>
           <button 
             onClick={() => { setActiveTab('register'); setError(null); }}
             className={`flex-1 py-3 text-sm font-medium transition ${activeTab === 'register' ? 'text-brand-orange border-b-2 border-brand-orange bg-gray-800/30' : 'text-gray-500 hover:text-gray-300'}`}
           >
             {t('register_tab')}
           </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
               <div>
                 <label className="block text-xs font-bold text-gray-500 mb-1">{t('lbl_username')}</label>
                 <input 
                   type="text" 
                   required
                   value={username}
                   onChange={(e) => setUsername(e.target.value)}
                   className="w-full bg-gray-950 border border-gray-700 rounded p-2.5 text-white focus:border-brand-blue outline-none transition"
                   disabled={isLoading}
                 />
               </div>
               
               <div>
                 <label className="block text-xs font-bold text-gray-500 mb-1">{t('lbl_password')}</label>
                 <input 
                   type="password" 
                   required
                   value={password}
                   onChange={(e) => setPassword(e.target.value)}
                   className="w-full bg-gray-950 border border-gray-700 rounded p-2.5 text-white focus:border-brand-blue outline-none transition"
                   disabled={isLoading}
                 />
               </div>

               {activeTab === 'register' && (
                 <div>
                   <label className="block text-xs font-bold text-gray-500 mb-1">{t('lbl_apikey')}</label>
                   <input 
                     type="password" 
                     required
                     value={apiKey}
                     onChange={(e) => setApiKey(e.target.value)}
                     className="w-full bg-gray-950 border border-gray-700 rounded p-2.5 text-white focus:border-brand-orange outline-none transition"
                     placeholder="sk-..."
                     disabled={isLoading}
                   />
                   <p className="text-[10px] text-gray-600 mt-1">Required for Gemini AI features.</p>
                 </div>
               )}

               {error && (
                 <div className="p-2 bg-red-900/30 border border-red-900/50 rounded text-red-400 text-xs text-center">
                   {error}
                 </div>
               )}

               <button 
                 type="submit"
                 disabled={isLoading}
                 className={`w-full py-3 mt-2 font-bold rounded transition shadow-lg ${isLoading ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-brand-blue text-white hover:bg-blue-600'}`}
               >
                 {isLoading ? 'Processing...' : (activeTab === 'login' ? t('btn_login') : t('btn_register'))}
               </button>
            </form>

            <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-gray-800"></div>
                <span className="flex-shrink mx-4 text-gray-600 text-[10px] font-bold uppercase">Or</span>
                <div className="flex-grow border-t border-gray-800"></div>
            </div>

            <button 
                onClick={handleDebugLogin}
                disabled={isLoading}
                className={`w-full py-2.5 rounded border border-gray-700 text-brand-orange font-bold text-xs hover:bg-gray-800 transition ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                {t('btn_debug')}
            </button>
        </div>
      </div>
    </div>
  );
};