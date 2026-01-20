import React, { useEffect, useState } from 'react';
import { useTask } from '../../services/taskContext';
import { useTranslation } from '../../services/translationService';

export const TaskMonitor: React.FC = () => {
  const { tasks, activeCount, cancelAll } = useTask();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(true);

  // Filter relevant tasks (remove old completed ones from view after a delay if needed)
  // For now, we show all current session tasks that haven't been manually cleared.
  
  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  const processingCount = tasks.filter(t => t.status === 'processing').length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const failedCount = tasks.filter(t => t.status === 'failed').length;
  const totalCount = tasks.length;

  if (totalCount === 0) return null;

  const isWorking = processingCount > 0 || pendingCount > 0;
  
  // Progress Calculation
  const progress = totalCount === 0 ? 0 : ((completedCount + failedCount) / totalCount) * 100;

  return (
    <div className={`fixed bottom-4 right-4 z-[9999] transition-all duration-300 ${isOpen ? 'w-80' : 'w-12'}`}>
      <div className="bg-[#161b22] border border-gray-700 rounded-lg shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div 
            className="h-10 bg-gray-900 flex items-center justify-between px-3 cursor-pointer select-none"
            onClick={() => setIsOpen(!isOpen)}
        >
             <div className="flex items-center gap-2">
                 {isWorking ? (
                     <div className="animate-spin h-3 w-3 border-2 border-brand-orange border-t-transparent rounded-full"></div>
                 ) : (
                     <span className="text-green-500 text-xs">✔</span>
                 )}
                 <span className="text-xs font-bold text-gray-200">Task Monitor</span>
             </div>
             <span className="text-[10px] text-gray-500">{completedCount}/{totalCount}</span>
        </div>

        {/* Content */}
        {isOpen && (
            <div className="p-3">
                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden mb-3">
                    <div 
                        className="h-full bg-brand-orange transition-all duration-300 ease-out"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>

                {/* Task List (Latest 3) */}
                <div className="space-y-2 mb-3 max-h-40 overflow-y-auto custom-scrollbar">
                    {tasks.slice().reverse().slice(0, 5).map(task => (
                        <div key={task.id} className="flex items-center justify-between text-[10px]">
                            <div className="flex items-center gap-2 overflow-hidden">
                                {task.status === 'pending' && <span className="text-gray-500 w-3">•</span>}
                                {task.status === 'processing' && <span className="text-brand-blue w-3 animate-pulse">▶</span>}
                                {task.status === 'completed' && <span className="text-green-500 w-3">✓</span>}
                                {task.status === 'failed' && <span className="text-red-500 w-3">✕</span>}
                                <span className="truncate text-gray-400 max-w-[150px]" title={task.description}>
                                    {task.description}
                                </span>
                            </div>
                            <span className={`uppercase font-bold text-[9px] ${
                                task.status === 'failed' ? 'text-red-900' : 
                                task.status === 'processing' ? 'text-blue-900' : 'text-gray-700'
                            }`}>
                                {task.status}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Footer Actions */}
                <div className="flex justify-between items-center border-t border-gray-800 pt-2">
                    <span className="text-[9px] text-gray-600">
                        {activeCount} Active Threads
                    </span>
                    {isWorking && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); cancelAll(); }}
                            className="px-2 py-1 bg-red-900/30 text-red-400 text-[10px] rounded hover:bg-red-900/50 border border-red-900/50"
                        >
                            Cancel All
                        </button>
                    )}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};