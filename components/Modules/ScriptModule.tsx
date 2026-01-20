import React, { useState, useEffect } from 'react';
import { useProject } from '../../services/projectService';
import { useTranslation } from '../../services/translationService';
import { generateProjectBible } from '../../services/geminiService';
import { StoryAgent } from '../../services/storyAgentService';
import { ProjectBible, ScriptShot, BibleCharacter, ScriptScene, PlotBreakdownItem, WorkflowTab } from '../../types';
import { useTask } from '../../services/taskContext';

type BibleSubTab = 'world' | 'characters' | 'episodes';

// Mode Prop: Determined by the MainLayout based on BottomNav
interface ScriptModuleProps {
    mode: 'planning' | 'scripting';
}

export const ScriptModule: React.FC<ScriptModuleProps> = ({ mode }) => {
  const { project, updateScriptData, updateProjectBible, updatePlotBreakdown, renameEpisodeSuffix, generateShotAsset, selectedEpisodeId, setSelectedEpisodeId, setTab, activeScriptContext, setActiveScriptContext, syncEpisodesFromBreakdown } = useProject();
  const { t, language } = useTranslation();
  const { addTask } = useTask();
  
  // Tab State for Planning Mode (Bible vs Breakdown)
  const [planningTab, setPlanningTab] = useState<'bible' | 'breakdown'>('bible');
  const [activeBibleTab, setActiveBibleTab] = useState<BibleSubTab>('world');

  // Bible State
  const [sourceText, setSourceText] = useState(project.bible?.sourceText || '');
  const [isBibleGenerating, setIsBibleGenerating] = useState(false);
  const [bibleError, setBibleError] = useState<string | null>(null);

  // Character Select State
  const [selectedCharIndex, setSelectedCharIndex] = useState<number>(0);

  // Breakdown State
  const [isBreakdownGenerating, setIsBreakdownGenerating] = useState(false);
  const [breakdownError, setBreakdownError] = useState<string | null>(null);

  // Screenplay State
  // repurpose epRawText as "detailedText"
  const [detailedText, setDetailedText] = useState('');
  
  // We prioritize selectedEpisodeId from global context, fallback to 1
  const activeEpId = selectedEpisodeId || 1;
  
  const [isScriptAnalyzing, setIsScriptAnalyzing] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<string>('');
  
  // Asset State
  const [isBatchAudioGenerating, setIsBatchAudioGenerating] = useState(false);

  useEffect(() => {
     if (project.bible?.sourceText) {
         setSourceText(project.bible.sourceText);
     }
  }, [project.bible]);

  const currentEpScript = project.scriptData[activeEpId] || [];

  const getAgent = () => {
    if (!project.apiKey) throw new Error(t('api_key_required'));
    return new StoryAgent(project.apiKey, project.bible, language);
  };

  // --- Handlers ---

  const handleGenerateBible = async () => {
      if (!project.apiKey) { setBibleError(t('api_key_required')); return; }
      if (!sourceText.trim()) { setBibleError(t('err_no_text')); return; }

      setIsBibleGenerating(true);
      setBibleError(null);

      try {
          // Blocking Task: Bible is crucial for next steps, so we keep it blocking for now, 
          // or we could move it to task manager but handling the UI refresh for a full object replacement is tricky asynchronously
          // Let's keep Bible synchronous for simplicity of UX flow, but move Heavy tasks like Images to async.
          const bible = await generateProjectBible(project.apiKey, sourceText, language);
          updateProjectBible(bible);
      } catch (e: any) {
          setBibleError(e.message || "Bible generation failed.");
      } finally {
          setIsBibleGenerating(false);
      }
  };

  const updateBibleField = (field: keyof ProjectBible, value: any) => {
    if (!project.bible) return;
    updateProjectBible({ ...project.bible, [field]: value });
  };

  const updateBibleCharacter = (index: number, charData: Partial<BibleCharacter>) => {
    if (!project.bible) return;
    const newChars = [...project.bible.characters];
    newChars[index] = { ...newChars[index], ...charData };
    updateBibleField('characters', newChars);
  };

  const addBibleCharacter = () => {
    if (!project.bible) return;
    const newChar: BibleCharacter = {
        name: "New Character",
        description: "",
        appearance: "",
        personality: "",
        visual_prompt: "",
        voice_type: "Male Deep"
    };
    updateBibleField('characters', [...project.bible.characters, newChar]);
    setSelectedCharIndex(project.bible.characters.length);
  };

  const removeBibleCharacter = (index: number) => {
    if (!project.bible) return;
    const newChars = project.bible.characters.filter((_, i) => i !== index);
    updateBibleField('characters', newChars);
    if (selectedCharIndex >= newChars.length) {
        setSelectedCharIndex(Math.max(0, newChars.length - 1));
    }
  };
  
  const handleBatchBreakdown = async () => {
      if (!sourceText.trim()) { setBreakdownError(t('err_no_text_bible')); return; }
      setIsBreakdownGenerating(true);
      setBreakdownError(null);
      
      try {
          const agent = getAgent();
          const items = await agent.generatePlotBreakdown(sourceText);
          updatePlotBreakdown(items);
          syncEpisodesFromBreakdown(items);

      } catch (e: any) {
          setBreakdownError(e.message);
      } finally {
          setIsBreakdownGenerating(false);
      }
  };

  const handleGenerateScript = async (epNum: number) => {
      if (!project.apiKey) { setScriptError(t('api_key_required')); return; }
      
      if (!activeScriptContext && !detailedText && !project.plotBreakdown.find(p => p.ep_num === epNum)) { 
          setScriptError(t('no_breakdown')); 
          return; 
      }

      setIsScriptAnalyzing(true);
      setScriptError(null);
      setCurrentStep('Writing...');

      try {
          const agent = getAgent();
          
          const breakdownItem = project.plotBreakdown?.find(p => p.ep_num === epNum) || {
              ep_num: epNum,
              title: `Episode ${epNum}`,
              summary: activeScriptContext || "No summary provided.",
              hook: "N/A",
              inciting_incident: "N/A",
              climax: "N/A"
          };

          const prevItem = project.plotBreakdown?.find(p => p.ep_num === epNum - 1);
          const prevSummary = prevItem ? prevItem.summary : undefined;

          const script = await agent.writeEpisodeScript(breakdownItem, detailedText, prevSummary);
          
          setCurrentStep('Reviewing...');
          const polishedScript = await agent.reviewAndFixScript(script);

          const cleanScript = polishedScript.map(scene => ({
              ...scene,
              shots: scene.shots.map(shot => ({
                  ...shot,
                  assets: shot.assets || {},
                  status: shot.status || { has_start: false, has_end: false, has_video: false, has_audio: false }
              }))
          }));

          updateScriptData(epNum, cleanScript);
      } catch (e: any) {
          setScriptError(e.message);
      } finally {
          setIsScriptAnalyzing(false);
          setCurrentStep('');
      }
  };

  const handleShotUpdate = (sceneId: string, shotId: string, field: keyof ScriptShot, value: string) => {
    const currentScenes = project.scriptData[activeEpId] || [];
    const newScriptData = currentScenes.map(scene => {
      if (scene.id !== sceneId) return scene;
      const newShots = scene.shots.map(shot => shot.id === shotId ? { ...shot, [field]: value } : shot);
      return { ...scene, shots: newShots };
    });
    updateScriptData(activeEpId, newScriptData);
  };

  // --- ASYNC TASK MANAGER INTEGRATION ---
  
  const handleAssetGeneration = (sceneId: string, shotId: string, assetType: 'start_frame' | 'end_frame' | 'audio') => {
      if (!project.apiKey) { alert(t('api_key_required')); return; }

      // Queue the task via TaskManager
      addTask(
          assetType === 'audio' ? 'AUDIO_GEN' : 'IMAGE_GEN',
          `${assetType} for Shot ${shotId}`,
          async () => {
              // The actual work
              await generateShotAsset(activeEpId, sceneId, shotId, assetType);
          }
      );
  };

  const handleBatchImageGeneration = () => {
      const scenes = project.scriptData[activeEpId] || [];
      let count = 0;
      scenes.forEach(scene => {
          scene.shots.forEach(shot => {
              if (shot.prompt && !shot.status?.has_start) {
                  count++;
                  addTask(
                      'IMAGE_GEN',
                      `Start Frame for Shot ${shot.shotNumber}`,
                      async () => {
                           await generateShotAsset(activeEpId, scene.id, shot.id, 'start_frame');
                      }
                  );
              }
          });
      });
      if (count === 0) alert("No shots found with missing images.");
  };

  const handleBatchAudioGeneration = () => {
      const scenes = project.scriptData[activeEpId] || [];
      let count = 0;
      scenes.forEach(scene => {
          scene.shots.forEach(shot => {
              if (shot.dialogue && !shot.status?.has_audio) {
                  count++;
                  addTask(
                      'AUDIO_GEN',
                      `Audio for Shot ${shot.shotNumber}`,
                      async () => {
                          await generateShotAsset(activeEpId, scene.id, shot.id, 'audio');
                      }
                  );
              }
          });
      });
      if (count === 0) alert("No shots found with missing audio.");
  };

  // --- Render Functions ---

  const renderBibleView = () => (
      <div className="flex h-full">
          {/* Left Side: Source Text */}
          <div className="w-[40%] border-r border-gray-800 flex flex-col bg-gray-900 p-4">
               <div className="flex justify-between items-center mb-2">
                 <h3 className="text-xs font-bold text-gray-500 uppercase">{t('lbl_source_text')}</h3>
                 {isBibleGenerating && <span className="text-[10px] text-brand-orange animate-pulse">Processing...</span>}
               </div>
               <textarea
                  className="flex-1 bg-gray-950 p-4 text-sm text-gray-300 resize-none outline-none focus:bg-gray-900 transition border border-gray-800 rounded mb-4 font-serif leading-relaxed"
                  placeholder={t('paste_script')}
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
               />
               <button 
                  onClick={handleGenerateBible}
                  disabled={isBibleGenerating}
                  className={`w-full py-3 rounded font-bold text-sm transition-all active:scale-95 ${isBibleGenerating ? 'bg-gray-700 text-gray-500' : 'bg-brand-orange text-white hover:bg-orange-600 shadow-lg shadow-orange-900/20'}`}
               >
                  {isBibleGenerating ? t('msg_bible_generating') : t('btn_extract_bible')}
               </button>
          </div>
          
          {/* Right Side: Bible Data */}
          <div className="w-[60%] flex flex-col bg-gray-950 overflow-hidden">
               <div className="flex bg-gray-900/50 border-b border-gray-800">
                  <button onClick={() => setActiveBibleTab('world')} className={`px-4 py-2 text-[10px] font-bold uppercase ${activeBibleTab === 'world' ? 'text-brand-blue border-b-2 border-brand-blue' : 'text-gray-500'}`}>World</button>
                  <button onClick={() => setActiveBibleTab('characters')} className={`px-4 py-2 text-[10px] font-bold uppercase ${activeBibleTab === 'characters' ? 'text-brand-blue border-b-2 border-brand-blue' : 'text-gray-500'}`}>Characters</button>
               </div>
               <div className="p-4 overflow-y-auto h-full">
                   {!project.bible ? (
                       <div className="flex items-center justify-center h-full text-gray-600 italic">No Bible Data Generated</div>
                   ) : (
                       <>
                           {activeBibleTab === 'world' && (
                               <textarea 
                                 className="w-full bg-gray-900 p-3 rounded border border-gray-800 text-sm text-gray-300 min-h-[300px] outline-none"
                                 value={project.bible.worldview}
                                 onChange={(e) => updateBibleField('worldview', e.target.value)}
                               />
                           )}
                           {activeBibleTab === 'characters' && (
                               <div className="space-y-4">
                                   {project.bible.characters.map((char, idx) => (
                                       <div key={idx} className="p-3 bg-gray-900 rounded border border-gray-800">
                                           <div className="font-bold text-brand-orange">{char.name}</div>
                                           <div className="text-xs text-gray-400 mt-1">{char.description}</div>
                                           <div className="text-[10px] font-mono text-gray-500 mt-2 p-2 bg-black/20 rounded">{char.visual_prompt}</div>
                                       </div>
                                   ))}
                               </div>
                           )}
                       </>
                   )}
               </div>
          </div>
      </div>
  );

  const renderBreakdownView = () => (
      <div className="flex h-full p-6 flex-col items-center overflow-y-auto">
           <div className="max-w-4xl w-full">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-bold text-gray-100">{t('step1_breakdown')}</h2>
                <button 
                    onClick={handleBatchBreakdown}
                    disabled={isBreakdownGenerating}
                    className={`px-6 py-3 rounded font-bold text-sm shadow-lg transition transform active:scale-95 ${isBreakdownGenerating ? 'bg-gray-800 text-gray-500' : 'bg-brand-blue text-white'}`}
                >
                    {isBreakdownGenerating ? t('processing') : t('btn_batch_breakdown')}
                </button>
            </div>
            {breakdownError && <div className="p-4 bg-red-900/30 text-red-400 mb-4 rounded">{breakdownError}</div>}
            
            {!project.plotBreakdown || project.plotBreakdown.length === 0 ? (
                 <div className="border-2 border-dashed border-gray-800 rounded-xl p-12 text-center text-gray-600">
                     <p>{t('no_breakdown')}</p>
                 </div>
            ) : (
                project.plotBreakdown.map((item) => (
                    <div 
                        key={item.ep_num} 
                        className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-4 hover:border-brand-orange transition cursor-pointer group relative"
                        onClick={() => {
                            // Linkage Logic: Set Episode, Set Context, Go to Stage 3
                            setSelectedEpisodeId(item.ep_num);
                            setActiveScriptContext(item.summary);
                            setTab(WorkflowTab.SCRIPTING);
                        }}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <span className="bg-brand-orange text-white text-[10px] font-black px-1.5 rounded">EP{item.ep_num}</span>
                                <h3 className="font-bold text-gray-200 group-hover:text-brand-orange transition">{item.title}</h3>
                            </div>
                            <span className="text-[10px] text-gray-500 bg-gray-800 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition">Click to Edit Script →</span>
                        </div>
                        <p className="text-sm text-gray-500 line-clamp-2">{item.summary}</p>
                    </div>
                ))
            )}
          </div>
      </div>
  );

  const renderScriptingTable = () => (
      <div className="flex h-full">
           {/* Left: Context & Inputs */}
           <div className="w-[28%] border-r border-gray-800 flex flex-col bg-gray-900">
                <div className="p-4 border-b border-gray-800 space-y-4">
                     <div className="text-xs text-gray-500 font-bold uppercase mb-2">
                        Active Episode: <span className="text-brand-orange">EP{activeEpId.toString().padStart(2, '0')}</span>
                     </div>
                     <button 
                        onClick={() => handleGenerateScript(activeEpId)}
                        disabled={isScriptAnalyzing}
                        className={`w-full py-3 rounded font-bold text-xs transition shadow-lg ${isScriptAnalyzing ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-brand-blue text-white hover:bg-blue-600'}`}
                     >
                        {isScriptAnalyzing ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="animate-spin h-3 w-3 border-2 border-white/30 border-t-white rounded-full"></span>
                                {currentStep || t('analyzing')}
                            </span>
                        ) : t('analyze_script')}
                     </button>
                     {scriptError && <div className="text-[10px] text-red-400 bg-red-900/20 p-2 rounded">{scriptError}</div>}
                </div>
                
                <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto">
                    {/* Read-Only Context */}
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-2">
                            Episode Context
                            <span className="bg-gray-800 text-gray-400 px-1 rounded text-[9px]">From Stage 1</span>
                        </label>
                        <textarea
                            readOnly
                            className="bg-gray-950 p-3 text-xs text-gray-400 outline-none border border-gray-800 rounded resize-none h-32 leading-relaxed"
                            value={activeScriptContext || "No summary context loaded. Please select an episode from Stage 1."}
                        />
                    </div>

                    {/* Optional Detailed Input */}
                    <div className="flex flex-col gap-1 flex-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-2">
                            Detailed Novel Text
                            <span className="bg-gray-800 text-brand-orange px-1 rounded text-[9px]">Optional</span>
                        </label>
                        <textarea
                            className="flex-1 bg-gray-950 p-3 text-sm text-gray-300 outline-none border border-gray-800 rounded resize-none placeholder-gray-700"
                            value={detailedText}
                            onChange={(e) => setDetailedText(e.target.value)}
                            placeholder="Paste specific chapter text here if you want the AI to follow it closely..."
                        />
                    </div>
                </div>
           </div>

           {/* Right: Asset-Centric Production Table */}
           <div className="w-[72%] flex flex-col bg-gray-950">
                <div className="p-3 border-b border-gray-800 bg-gray-900/50 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('tab_screenplay')}</h2>
                        <span className="text-[10px] text-gray-600 font-mono">EP{activeEpId} • {currentEpScript.reduce((a,s)=>a+s.shots.length,0)} Shots</span>
                    </div>
                    {/* Toolbar */}
                    <div className="flex gap-2">
                         <button 
                            onClick={handleBatchImageGeneration}
                            className="px-3 py-1.5 rounded border border-gray-700 text-xs font-bold flex items-center gap-2 transition bg-gray-800 text-white hover:bg-brand-blue hover:border-brand-blue"
                         >
                             🖼️ Batch Images
                         </button>
                        <button 
                            onClick={handleBatchAudioGeneration}
                            className="px-3 py-1.5 rounded border border-gray-700 text-xs font-bold flex items-center gap-2 transition bg-gray-800 text-white hover:bg-gray-700 hover:border-gray-500"
                        >
                            🔊 {t('btn_batch_audio')}
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-auto p-4 scroll-smooth">
                    {currentEpScript.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-50">
                            <span className="text-5xl mb-4">🎬</span>
                            <p className="text-sm font-medium">{t('no_script_data')}</p>
                        </div>
                    ) : (
                        <div className="space-y-8 pb-20">
                        {currentEpScript.map((scene) => (
                            <div key={scene.id} className="border border-gray-800 rounded-lg overflow-hidden bg-gray-900/30 shadow-sm">
                            <div className="bg-gray-800/80 px-4 py-2 flex justify-between items-center border-b border-gray-800">
                                <span className="font-black text-[10px] text-gray-400 uppercase tracking-tighter">SCENE {scene.sceneNumber}</span>
                                <span className="text-xs text-brand-blue font-bold font-mono">{scene.location} // {scene.time}</span>
                            </div>
                            <table className="w-full text-xs text-left border-collapse table-fixed">
                                <thead className="bg-gray-950/50 text-[10px] text-gray-500 font-bold uppercase tracking-tight">
                                <tr>
                                    <th className="p-2 w-8 text-center border-r border-gray-800">#</th>
                                    <th className="p-2 w-16 border-r border-gray-800">Type</th>
                                    <th className="p-2 w-1/5 border-r border-gray-800">Action/Dialogue</th>
                                    <th className="p-2 w-1/5 border-r border-gray-800">Prompt</th>
                                    <th className="p-2 w-20 text-center border-r border-gray-800">Start</th>
                                    <th className="p-2 w-20 text-center border-r border-gray-800">End</th>
                                    <th className="p-2 w-20 text-center">Audio</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800">
                                {scene.shots.map((shot) => (
                                    <tr key={shot.id} className="group hover:bg-white/[0.02] transition">
                                    <td className="p-2 text-gray-600 align-top border-r border-gray-800 text-center font-mono">{shot.shotNumber}</td>
                                    
                                    <td className="p-1 align-top border-r border-gray-800">
                                        <input 
                                            value={shot.shotType || ''}
                                            onChange={(e) => handleShotUpdate(scene.id, shot.id, 'shotType', e.target.value)}
                                            className="w-full bg-transparent text-gray-400 outline-none focus:text-white px-1"
                                        />
                                        <div className="text-[9px] text-gray-600 px-1 mt-1">{shot.duration || '2s'}</div>
                                    </td>

                                    <td className="p-1 align-top border-r border-gray-800">
                                        <textarea 
                                            value={shot.description}
                                            onChange={(e) => handleShotUpdate(scene.id, shot.id, 'description', e.target.value)}
                                            className="w-full bg-transparent text-gray-300 outline-none focus:text-white resize-none h-16 p-1 leading-snug mb-1"
                                            placeholder="Action"
                                        />
                                        {shot.dialogue && (
                                            <div className="bg-black/20 p-1 rounded">
                                                <span className="text-orange-400 text-[9px] font-bold block">{shot.speaker}</span>
                                                <span className="text-gray-400 italic">{shot.dialogue}</span>
                                            </div>
                                        )}
                                    </td>

                                    <td className="p-1 align-top border-r border-gray-800">
                                        <textarea 
                                            value={shot.prompt}
                                            onChange={(e) => handleShotUpdate(scene.id, shot.id, 'prompt', e.target.value)}
                                            className="w-full bg-transparent text-blue-300/80 font-mono text-[9px] outline-none focus:text-blue-200 resize-none h-24 p-1 leading-tight"
                                        />
                                    </td>

                                    {/* ASSET: START FRAME */}
                                    <td className="p-1 align-top border-r border-gray-800 text-center">
                                        {shot.status?.has_start ? (
                                            <div className="w-16 h-16 bg-gray-900 rounded overflow-hidden border border-gray-700 relative group/img mx-auto">
                                                <img src={shot.assets.start_frame} alt="Start" className="w-full h-full object-cover" />
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={() => handleAssetGeneration(scene.id, shot.id, 'start_frame')}
                                                className="w-16 h-16 bg-gray-900/50 rounded border border-dashed border-gray-700 flex items-center justify-center text-gray-600 hover:text-brand-blue hover:border-brand-blue transition mx-auto"
                                            >
                                                <span className="text-[10px] font-bold">GEN</span>
                                            </button>
                                        )}
                                    </td>

                                    {/* ASSET: END FRAME */}
                                    <td className="p-1 align-top border-r border-gray-800 text-center">
                                         {shot.status?.has_end ? (
                                            <div className="w-16 h-16 bg-gray-900 rounded overflow-hidden border border-gray-700 relative group/img mx-auto">
                                                <img src={shot.assets.end_frame} alt="End" className="w-full h-full object-cover" />
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={() => handleAssetGeneration(scene.id, shot.id, 'end_frame')}
                                                className="w-16 h-16 bg-gray-900/50 rounded border border-dashed border-gray-700 flex items-center justify-center text-gray-600 hover:text-brand-blue hover:border-brand-blue transition mx-auto"
                                            >
                                                <span className="text-[10px] font-bold">GEN</span>
                                            </button>
                                        )}
                                    </td>

                                    {/* ASSET: AUDIO */}
                                    <td className="p-1 align-top text-center">
                                         {shot.status?.has_audio ? (
                                            <div className="w-16 h-16 bg-gray-900 rounded border border-gray-700 flex flex-col items-center justify-center text-green-500 mx-auto">
                                                <span className="text-lg">🔊</span>
                                                <span className="text-[9px]">Ready</span>
                                            </div>
                                        ) : (
                                            <button 
                                                className="w-16 h-16 bg-gray-900/50 rounded border border-dashed border-gray-700 flex items-center justify-center text-gray-600 hover:text-green-500 hover:border-green-500 transition mx-auto"
                                                onClick={() => handleAssetGeneration(scene.id, shot.id, 'audio')}
                                            >
                                                <span className="text-[10px] font-bold">TTS</span>
                                            </button>
                                        )}
                                    </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                            </div>
                        ))}
                        </div>
                    )}
                </div>
           </div>
      </div>
  );

  // --- Main Render Switch ---

  if (mode === 'planning') {
      return (
        <div className="flex flex-col h-full select-none">
            <div className="h-10 bg-gray-950 border-b border-gray-800 flex shadow-md relative z-10">
                <button onClick={() => setPlanningTab('bible')} className={`px-8 text-xs font-black uppercase tracking-widest transition-all ${planningTab === 'bible' ? 'bg-gray-900 text-brand-orange border-b-2 border-brand-orange' : 'text-gray-500 hover:text-gray-300'}`}>{t('tab_bible')}</button>
                <button onClick={() => setPlanningTab('breakdown')} className={`px-8 text-xs font-black uppercase tracking-widest transition-all ${planningTab === 'breakdown' ? 'bg-gray-900 text-brand-orange border-b-2 border-brand-orange' : 'text-gray-500 hover:text-gray-300'}`}>{t('tab_breakdown')}</button>
            </div>
            <div className="flex-1 overflow-hidden relative">
                {planningTab === 'bible' && renderBibleView()}
                {planningTab === 'breakdown' && renderBreakdownView()}
            </div>
        </div>
      );
  } else {
      // Scripting Mode
      return renderScriptingTable();
  }
};