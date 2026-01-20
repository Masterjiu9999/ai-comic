import React, { useState } from 'react';
import { useTranslation } from '../../services/translationService';
import { useProject } from '../../services/projectService';

export const StoryboardModule: React.FC = () => {
  const { t } = useTranslation();
  const { project, selectedEpisodeId, generateShotAsset } = useProject();
  
  const activeEpId = selectedEpisodeId || 1;
  const scenes = project.scriptData[activeEpId] || [];
  
  const [generatingShotId, setGeneratingShotId] = useState<string | null>(null);

  const handleRegenerate = async (sceneId: string, shotId: string) => {
      setGeneratingShotId(shotId);
      await generateShotAsset(activeEpId, sceneId, shotId, 'start_frame');
      setGeneratingShotId(null);
  };

  const totalShots = scenes.reduce((acc, scene) => acc + scene.shots.length, 0);

  if (totalShots === 0) {
      return (
          <div className="h-full flex items-center justify-center text-gray-500 flex-col">
              <span className="text-4xl mb-2">🖼️</span>
              <p>{t('no_visual_data')}</p>
          </div>
      );
  }

  return (
    <div className="h-full bg-gray-950 overflow-y-auto p-6">
       <div className="max-w-7xl mx-auto">
           <div className="mb-6 flex justify-between items-end border-b border-gray-800 pb-2">
               <div>
                   <h2 className="text-xl font-bold text-gray-200">{t('tab_visualizing')}</h2>
                   <p className="text-xs text-gray-500">EP{activeEpId.toString().padStart(2,'0')} • {totalShots} Shots</p>
               </div>
           </div>

           <div className="space-y-12">
               {scenes.map(scene => (
                   <div key={scene.id}>
                       <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 sticky top-0 bg-gray-950/90 py-2 backdrop-blur-sm z-10">
                           SCENE {scene.sceneNumber} <span className="text-gray-600 font-normal">| {scene.location}</span>
                       </h3>
                       
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                           {scene.shots.map(shot => (
                               <div key={shot.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-lg group hover:border-gray-600 transition-colors">
                                   {/* Image Area */}
                                   <div className="aspect-video bg-black relative">
                                       {shot.status?.has_start ? (
                                           <img src={shot.assets.start_frame} alt="Shot" className="w-full h-full object-cover" />
                                       ) : (
                                           <div className="w-full h-full flex items-center justify-center text-gray-700">
                                               <span className="text-xs">No Image</span>
                                           </div>
                                       )}
                                       
                                       <div className="absolute top-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[10px] font-mono text-white">
                                           Shot {shot.shotNumber} • {shot.shotType}
                                       </div>

                                       <button 
                                            onClick={() => handleRegenerate(scene.id, shot.id)}
                                            disabled={!!generatingShotId}
                                            className="absolute bottom-2 right-2 bg-brand-orange hover:bg-orange-600 text-white p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                            title={t('regenerate_image')}
                                       >
                                            {generatingShotId === shot.id ? (
                                                <span className="animate-spin block w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></span>
                                            ) : (
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                            )}
                                       </button>
                                   </div>

                                   {/* Content Area */}
                                   <div className="p-4">
                                       <div className="mb-2">
                                           <p className="text-[10px] font-bold text-gray-500 uppercase">Visual Prompt</p>
                                           <p className="text-xs text-blue-300/80 font-mono line-clamp-3 leading-relaxed mt-1">{shot.prompt}</p>
                                       </div>
                                       {shot.dialogue && (
                                           <div className="bg-black/20 p-2 rounded mt-2">
                                               <p className="text-[10px] font-bold text-orange-400 uppercase">{shot.speaker}</p>
                                               <p className="text-xs text-gray-400 italic">"{shot.dialogue}"</p>
                                           </div>
                                       )}
                                   </div>
                               </div>
                           ))}
                       </div>
                   </div>
               ))}
           </div>
       </div>
    </div>
  );
};