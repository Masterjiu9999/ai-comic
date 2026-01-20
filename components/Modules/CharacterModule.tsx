import React, { useState } from 'react';
import { useProject } from '../../services/projectService';
import { useTranslation } from '../../services/translationService';
import { BibleCharacter } from '../../types';
import { generateImage } from '../../services/geminiService';

const STYLE_PRESETS = [
    "Japanese Anime (Cel Shaded) / 日系赛璐珞",
    "Modern Manhwa (Thick Paint) / 韩系厚涂",
    "American Comic (Sharp Lines) / 美漫硬朗",
    "Ghibli Style (Watercolor) / 吉卜力水彩",
    "Cinematic Realistic (Unreal Engine 5) / 写实电影感",
    "Cyberpunk Neon / 赛博朋克"
];

export const CharacterModule: React.FC = () => {
  const { project, updateProjectBible, updateProjectSettings } = useProject();
  const { t } = useTranslation();

  const [selectedCharIndex, setSelectedCharIndex] = useState<number>(0);
  const [generatingType, setGeneratingType] = useState<'portrait' | 'sheet' | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  // Fallback to empty if no characters
  const characters = project.bible?.characters || [];
  const selectedChar = characters[selectedCharIndex];

  // --- Logic ---

  const handleUpdateChar = (updates: Partial<BibleCharacter>) => {
    if (!project.bible) return;
    const newChars = [...project.bible.characters];
    newChars[selectedCharIndex] = { ...newChars[selectedCharIndex], ...updates };
    updateProjectBible({ ...project.bible, characters: newChars });
  };

  const handleAddCharacter = () => {
    if (!project.bible) return;
    const newChar: BibleCharacter = {
      name: "New Character",
      age: "Unknown",
      role: "Supporting",
      description: "",
      appearance: "",
      personality: "",
      visual_prompt: "",
      voice_type: "Male Deep",
      master_ref: 'portrait'
    };
    const newChars = [...project.bible.characters, newChar];
    updateProjectBible({ ...project.bible, characters: newChars });
    setSelectedCharIndex(newChars.length - 1);
  };

  const handleDeleteCharacter = () => {
      if (!project.bible) return;
      if (!window.confirm(`Delete ${selectedChar.name}?`)) return;
      
      const newChars = project.bible.characters.filter((_, i) => i !== selectedCharIndex);
      updateProjectBible({ ...project.bible, characters: newChars });
      setSelectedCharIndex(Math.max(0, selectedCharIndex - 1));
  };

  const handleGenerate = async (type: 'portrait' | 'sheet') => {
      if (!project.apiKey) {
          alert(t('api_key_required'));
          return;
      }
      setGeneratingType(type);

      try {
          const desc = selectedChar.description || "A character";
          const visuals = selectedChar.visual_prompt || "detailed appearance";
          
          // --- SANDWICH LOGIC ---
          const stylePrompt = `${project.globalStylePreset || STYLE_PRESETS[0].split(' /')[0]}, ${project.globalStyleCustom || ''}`;
          // Background Constraint placed after description to ensure attention
          const constraint = "SOLID WHITE BACKGROUND, plain background, no scenery, no noise."; 
          const quality = "Best quality, master piece, character sheet, 8k resolution.";

          let fullPrompt = "";
          let aspectRatio = "1:1";

          if (type === 'portrait') {
              // Strategy: [Style] + [Char] + [Constraint] + [Quality]
              fullPrompt = `Art Style: ${stylePrompt}. Character: ${selectedChar.name}, ${desc}. Visual details: ${visuals}. Constraint: ${constraint} Facing camera, emotive expression. Upper body shot. ${quality}`;
              aspectRatio = "9:16";
          } else {
              fullPrompt = `Art Style: ${stylePrompt}. Full character design sheet for ${selectedChar.name}, ${desc}. Visual details: ${visuals}. Constraint: ${constraint} Include Front view, Side view, and Back view. Neutral pose. Concept art style. ${quality}`;
              aspectRatio = "16:9";
          }

          const imageUrl = await generateImage(project.apiKey, fullPrompt, aspectRatio);

          // Update Character Data
          if (type === 'portrait') {
              const updates: Partial<BibleCharacter> = { portrait_path: imageUrl };
              // Auto-set master if it's the first image
              if (!selectedChar.ref_sheet_path && !selectedChar.portrait_path) {
                  updates.master_ref = 'portrait';
              }
              handleUpdateChar(updates);
          } else {
              const updates: Partial<BibleCharacter> = { ref_sheet_path: imageUrl };
               // Auto-set master if it's the first image and no portrait set
              if (!selectedChar.portrait_path && !selectedChar.ref_sheet_path) {
                  updates.master_ref = 'sheet';
              }
              handleUpdateChar(updates);
          }

      } catch (e: any) {
          console.error(e);
          alert("Generation failed: " + e.message);
      } finally {
          setGeneratingType(null);
      }
  };

  return (
    <div className="flex flex-col h-full bg-gray-950 text-gray-200 select-none">
      
      {/* Top: Global Style Bar */}
      <div className="bg-gray-900 border-b border-gray-800 p-4 shrink-0">
          <fieldset className="border border-gray-700 rounded-lg p-3 flex gap-6 items-center bg-gray-950/50">
              <legend className="text-[10px] font-bold text-brand-orange px-2 uppercase">{t('lbl_global_style')}</legend>
              
              {/* Preset Combo */}
              <div className="flex flex-col gap-1 w-64">
                  <label className="text-[10px] text-gray-500 font-bold uppercase">{t('lbl_style_preset')}</label>
                  <div className="relative">
                      <select 
                        className="w-full bg-gray-900 border border-gray-700 rounded text-xs text-white p-2 outline-none focus:border-brand-blue appearance-none"
                        value={project.globalStylePreset || STYLE_PRESETS[0]}
                        onChange={(e) => updateProjectSettings({ globalStylePreset: e.target.value })}
                      >
                          {STYLE_PRESETS.map(style => (
                              <option key={style} value={style}>{style}</option>
                          ))}
                      </select>
                      <div className="absolute right-2 top-2 pointer-events-none text-[10px] text-gray-500">▼</div>
                  </div>
              </div>

              {/* Custom Input */}
              <div className="flex flex-col gap-1 flex-1">
                  <label className="text-[10px] text-gray-500 font-bold uppercase">{t('lbl_style_custom')}</label>
                  <input 
                    type="text"
                    className="w-full bg-gray-900 border border-gray-700 rounded text-xs text-white p-2 outline-none focus:border-brand-blue placeholder-gray-700"
                    placeholder={t('placeholder_style')}
                    value={project.globalStyleCustom || ''}
                    onChange={(e) => updateProjectSettings({ globalStyleCustom: e.target.value })}
                  />
              </div>
          </fieldset>
      </div>

      {/* Content Split: Sidebar + Main Area */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar: Character List */}
        <div className="w-64 border-r border-gray-800 flex flex-col bg-gray-900 z-10">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-[#161b22]">
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">{t('lbl_char_list')}</h2>
            <button 
                onClick={handleAddCharacter}
                className="w-6 h-6 flex items-center justify-center bg-gray-800 rounded text-brand-orange hover:bg-gray-700 transition"
            >
                +
            </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {characters.map((char, idx) => (
                    <div 
                        key={idx}
                        onClick={() => setSelectedCharIndex(idx)}
                        className={`flex items-center gap-3 p-2 rounded cursor-pointer transition border ${
                            selectedCharIndex === idx 
                            ? 'bg-brand-blue/10 border-brand-blue/50' 
                            : 'bg-transparent border-transparent hover:bg-white/5'
                        }`}
                    >
                        {/* Tiny Thumbnail Avatar */}
                        <div className="w-8 h-8 rounded-full bg-gray-800 overflow-hidden shrink-0 border border-gray-700">
                            {char.portrait_path ? (
                                <img src={char.portrait_path} className="w-full h-full object-cover" alt="" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-500">?</div>
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className={`text-sm font-bold truncate ${selectedCharIndex === idx ? 'text-brand-blue' : 'text-gray-300'}`}>{char.name}</div>
                            <div className="text-[10px] text-gray-500 truncate">{char.role || 'Character'}</div>
                        </div>
                        {/* Master Ref Indicator in List */}
                        {char.master_ref && (
                        <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.6)]" title={`Master Ref: ${char.master_ref}`}></div>
                        )}
                    </div>
                ))}
                
                {characters.length === 0 && (
                    <div className="p-4 text-center text-xs text-gray-500 italic">
                        {t('char_forge_desc')}
                    </div>
                )}
            </div>
        </div>

        {/* Main Area: Profile Card */}
        <div className="flex-1 overflow-y-auto p-8 relative">
            {characters.length > 0 ? (
                <div className="max-w-5xl mx-auto space-y-6">
                    
                    {/* Header / Identity Section */}
                    <div className="flex justify-between items-start border-b border-gray-800 pb-6">
                        <div className="flex-1 mr-8">
                            <div className="flex items-center gap-4 mb-4">
                                <input 
                                    value={selectedChar.name}
                                    onChange={(e) => handleUpdateChar({ name: e.target.value })}
                                    className="bg-transparent text-3xl font-black text-white outline-none placeholder-gray-700 w-full border-b border-transparent focus:border-gray-700 transition"
                                    placeholder="Character Name"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Role / Archetype</label>
                                    <input 
                                        value={selectedChar.role || ''}
                                        onChange={(e) => handleUpdateChar({ role: e.target.value })}
                                        className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-gray-300 focus:border-brand-orange outline-none"
                                        placeholder="e.g. Protagonist"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Age</label>
                                    <input 
                                        value={selectedChar.age || ''}
                                        onChange={(e) => handleUpdateChar({ age: e.target.value })}
                                        className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-gray-300 focus:border-brand-orange outline-none"
                                        placeholder="e.g. 24"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Visual Prompt (Physical Tags)</label>
                                <textarea 
                                    value={selectedChar.visual_prompt}
                                    onChange={(e) => handleUpdateChar({ visual_prompt: e.target.value })}
                                    className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-xs font-mono text-blue-300 focus:border-brand-blue outline-none h-24 resize-none leading-relaxed"
                                    placeholder="Detailed visual description (hair color, eye color, outfit, style)..."
                                />
                            </div>
                        </div>
                        <div>
                            <button 
                                onClick={handleDeleteCharacter}
                                className="px-4 py-2 bg-red-900/20 text-red-400 border border-red-900/50 rounded hover:bg-red-900/40 text-xs font-bold transition"
                            >
                                Delete Character
                            </button>
                        </div>
                    </div>

                    {/* Visual Assets Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        
                        {/* Portrait Card */}
                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col shadow-lg">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-sm font-bold text-gray-300 uppercase flex items-center gap-2">
                                    📸 Portrait / 立绘
                                    {selectedChar.master_ref === 'portrait' && <span className="text-[10px] bg-green-900 text-green-300 px-1.5 rounded border border-green-700 font-bold">MASTER</span>}
                                </h3>
                                <button 
                                    onClick={() => handleGenerate('portrait')}
                                    disabled={!!generatingType}
                                    className="text-[10px] bg-gray-800 text-gray-300 border border-gray-600 hover:bg-brand-blue hover:text-white hover:border-brand-blue px-3 py-1.5 rounded transition disabled:opacity-50 font-bold"
                                >
                                    {generatingType === 'portrait' ? 'Generating...' : 'Generate Portrait'}
                                </button>
                            </div>
                            
                            <div className="relative w-full aspect-[9/16] bg-black rounded-lg overflow-hidden border border-gray-700 group">
                                {selectedChar.portrait_path ? (
                                    <>
                                        <img 
                                            src={selectedChar.portrait_path} 
                                            className="w-full h-full object-cover cursor-pointer hover:scale-105 transition duration-500" 
                                            alt="Portrait"
                                            onClick={() => setViewingImage(selectedChar.portrait_path || null)}
                                        />
                                        {/* Overlay Gradient */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                    </>
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-700">
                                        <span className="text-4xl mb-2">👤</span>
                                        <span className="text-xs">No Portrait</span>
                                    </div>
                                )}
                                
                                {generatingType === 'portrait' && (
                                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-10 backdrop-blur-sm">
                                        <div className="flex flex-col items-center">
                                            <div className="animate-spin h-8 w-8 border-4 border-gray-600 border-t-brand-orange rounded-full mb-2"></div>
                                            <span className="text-xs text-brand-orange font-bold animate-pulse">Rendering...</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 pt-3 border-t border-gray-800">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition ${selectedChar.master_ref === 'portrait' ? 'border-green-500 bg-green-500/20' : 'border-gray-600 group-hover:border-gray-400'}`}>
                                        {selectedChar.master_ref === 'portrait' && <div className="w-2 h-2 bg-green-500 rounded-full" />}
                                    </div>
                                    <input 
                                        type="radio" 
                                        name="master_ref" 
                                        className="hidden" 
                                        checked={selectedChar.master_ref === 'portrait'}
                                        onChange={() => handleUpdateChar({ master_ref: 'portrait' })}
                                    />
                                    <span className={`text-xs font-bold transition ${selectedChar.master_ref === 'portrait' ? 'text-green-400' : 'text-gray-500 group-hover:text-gray-300'}`}>
                                        Set as Master Reference
                                    </span>
                                </label>
                                <p className="text-[9px] text-gray-600 mt-1 pl-6">Used as the primary visual guide for storyboards.</p>
                            </div>
                        </div>

                        {/* Reference Sheet Card */}
                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col shadow-lg">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-sm font-bold text-gray-300 uppercase flex items-center gap-2">
                                    📐 Design Sheet / 设定图
                                    {selectedChar.master_ref === 'sheet' && <span className="text-[10px] bg-green-900 text-green-300 px-1.5 rounded border border-green-700 font-bold">MASTER</span>}
                                </h3>
                                <button 
                                    onClick={() => handleGenerate('sheet')}
                                    disabled={!!generatingType}
                                    className="text-[10px] bg-gray-800 text-gray-300 border border-gray-600 hover:bg-brand-blue hover:text-white hover:border-brand-blue px-3 py-1.5 rounded transition disabled:opacity-50 font-bold"
                                >
                                    {generatingType === 'sheet' ? 'Generating...' : 'Generate Sheet'}
                                </button>
                            </div>
                            
                            <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-gray-700 group">
                                {selectedChar.ref_sheet_path ? (
                                    <>
                                        <img 
                                            src={selectedChar.ref_sheet_path} 
                                            className="w-full h-full object-cover cursor-pointer hover:scale-105 transition duration-500" 
                                            alt="Ref Sheet"
                                            onClick={() => setViewingImage(selectedChar.ref_sheet_path || null)}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                    </>
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-700">
                                        <span className="text-4xl mb-2">📐</span>
                                        <span className="text-xs">No Design Sheet</span>
                                    </div>
                                )}

                                {generatingType === 'sheet' && (
                                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-10 backdrop-blur-sm">
                                        <div className="flex flex-col items-center">
                                            <div className="animate-spin h-8 w-8 border-4 border-gray-600 border-t-brand-orange rounded-full mb-2"></div>
                                            <span className="text-xs text-brand-orange font-bold animate-pulse">Rendering...</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 pt-3 border-t border-gray-800">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition ${selectedChar.master_ref === 'sheet' ? 'border-green-500 bg-green-500/20' : 'border-gray-600 group-hover:border-gray-400'}`}>
                                        {selectedChar.master_ref === 'sheet' && <div className="w-2 h-2 bg-green-500 rounded-full" />}
                                    </div>
                                    <input 
                                        type="radio" 
                                        name="master_ref" 
                                        className="hidden" 
                                        checked={selectedChar.master_ref === 'sheet'}
                                        onChange={() => handleUpdateChar({ master_ref: 'sheet' })}
                                    />
                                    <span className={`text-xs font-bold transition ${selectedChar.master_ref === 'sheet' ? 'text-green-400' : 'text-gray-500 group-hover:text-gray-300'}`}>
                                        Set as Master Reference
                                    </span>
                                </label>
                                <p className="text-[9px] text-gray-600 mt-1 pl-6">Best for consistency in complex angles.</p>
                            </div>
                        </div>

                    </div>
                </div>
            ) : (
                <div className="flex items-center justify-center h-full text-gray-500 flex-col">
                    <span className="text-4xl mb-4">👥</span>
                    <p className="mb-4">No characters found.</p>
                    <button onClick={handleAddCharacter} className="px-6 py-2 bg-brand-blue text-white rounded font-bold">Create Character</button>
                </div>
            )}
        </div>
      </div>

      {/* Image Viewer Modal */}
      {viewingImage && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-8"
            onClick={() => setViewingImage(null)}
          >
              <img src={viewingImage} className="max-w-full max-h-full rounded shadow-2xl border border-gray-800" alt="Full View" />
              <button 
                className="absolute top-4 right-4 text-white text-2xl hover:text-gray-300"
                onClick={() => setViewingImage(null)}
              >
                  &times;
              </button>
          </div>
      )}

    </div>
  );
};