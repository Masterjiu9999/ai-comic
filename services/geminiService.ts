import { GoogleGenAI, Type } from "@google/genai";
import { ScriptScene, ProjectBible } from '../types';

// Helper to check API Key presence
const getAIClient = (apiKey: string | undefined) => {
  if (!apiKey) throw new Error("API Key is missing. Please set it in Settings.");
  return new GoogleGenAI({ apiKey });
};

export const generateProjectBible = async (apiKey: string, fullText: string, language: 'en' | 'zh'): Promise<ProjectBible> => {
    const ai = getAIClient(apiKey);
    
    // Using gemini-3-pro-preview for large context window and reasoning
    const model = "gemini-3-pro-preview";

    const langInstruction = language === 'zh' 
    ? "Output all content strictly in SIMPLIFIED CHINESE, EXCEPT for art_style_keywords and visual_prompt which should be in ENGLISH." 
    : "Output all content strictly in ENGLISH.";

    const systemInstruction = `
      You are an expert story analyst and series planner for high-end animation and comics.
      Your task is to analyze the provided NOVEL TEXT and extract a comprehensive "Series Bible".
      ${langInstruction}
      
      Extract:
      1. worldview: A description of the setting, world rules, atmosphere.
      2. artStyleKeywords: A detailed COMMA-SEPARATED string of English tags defining the visual direction (e.g., "Cyberpunk, high contrast, neon lighting, anime style, detailed backgrounds, 8k").
      3. coreRules: The underlying logic of the world (magic, tech, or societal rules).
      4. characters: A list of main characters including:
         - name
         - description (role/history)
         - appearance (brief summary)
         - personality
         - visual_prompt: A specific string of ENGLISH comma-separated tags for an AI image generator describing the character's face, hair, and outfit.
         - voice_type: Suggestion for TTS (e.g., "Male Deep", "Female Soft", "Energetic Youth").
      5. episodeSummaries: Break the story into logical Episodes. Provide an ID, a Summary, and "key_events" (major plot points).

      Return STRICT JSON matching the schema provided.
    `;

    const response = await ai.models.generateContent({
        model,
        contents: fullText,
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    worldview: { type: Type.STRING },
                    artStyleKeywords: { type: Type.STRING },
                    coreRules: { type: Type.STRING },
                    characters: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                description: { type: Type.STRING },
                                appearance: { type: Type.STRING },
                                personality: { type: Type.STRING },
                                visual_prompt: { type: Type.STRING },
                                voice_type: { type: Type.STRING }
                            },
                            required: ["name", "description", "appearance", "personality", "visual_prompt", "voice_type"]
                        }
                    },
                    episodeSummaries: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                id: { type: Type.INTEGER },
                                summary: { type: Type.STRING },
                                key_events: { type: Type.STRING }
                            },
                            required: ["id", "summary", "key_events"]
                        }
                    }
                },
                required: ["worldview", "artStyleKeywords", "coreRules", "characters", "episodeSummaries"]
            }
        }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    const data = JSON.parse(text);
    return {
        ...data,
        sourceText: fullText
    } as ProjectBible;
};

export const analyzeScript = async (
    apiKey: string, 
    rawText: string, 
    language: 'en' | 'zh' = 'en',
    bible?: ProjectBible,
    episodeId?: number
): Promise<ScriptScene[]> => {
  const ai = getAIClient(apiKey);
  
  const model = "gemini-3-pro-preview";
  
  const langInstruction = language === 'zh' 
    ? "Output all descriptions, dialogues, and speaker names strictly in SIMPLIFIED CHINESE." 
    : "Output all descriptions, dialogues, and speaker names strictly in ENGLISH.";

  // Context Construction
  let contextSection = "";
  if (bible) {
      const epSummary = bible.episodeSummaries.find(e => e.id === episodeId)?.summary || "N/A";
      const charList = bible.characters.map(c => `${c.name}: ${c.description}. Visuals: ${c.visual_prompt}`).join("; ");
      
      contextSection = `
      [CONTEXT - WORLDVIEW]:
      ${bible.worldview}
      [CONTEXT - ART STYLE]:
      ${bible.artStyleKeywords}

      [CONTEXT - CHARACTERS]:
      ${charList}

      [CONTEXT - EPISODE SUMMARY]:
      ${epSummary}
      `;
  }

  const systemInstruction = `
    Role: Professional Storyboard Artist & Director.
    Task: Convert the provided Novel Text into a standard screenplay/storyboard shot list.

    ${contextSection}

    ${langInstruction}
    
    Rules:
    1. Break the text into SCENES based on location or major time jumps.
    2. Break scenes into SHOTS. Merge consecutive dialogue lines if they belong to the same shot and action.
    3. Ensure visual consistency using the ART STYLE provided.
    4. For 'prompt' (Visual Prompt): Generate a highly detailed, COMMA-SEPARATED list of tags optimized for AI Image Generators. Use characters' visual tags provided in context. ALWAYS use ENGLISH for the prompt tags.
    5. For 'audioPrompt': Describe sound effects and background ambience.

    Return STRICT JSON.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: rawText,
    config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING },
                    sceneNumber: { type: Type.INTEGER },
                    location: { type: Type.STRING },
                    time: { type: Type.STRING },
                    shots: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                id: { type: Type.STRING },
                                sceneId: { type: Type.STRING },
                                shotNumber: { type: Type.INTEGER },
                                shotType: { type: Type.STRING },
                                description: { type: Type.STRING },
                                dialogue: { type: Type.STRING, nullable: true },
                                speaker: { type: Type.STRING, nullable: true },
                                prompt: { type: Type.STRING },
                                audioPrompt: { type: Type.STRING, nullable: true }
                            },
                            required: ["id", "shotNumber", "description", "prompt"]
                        }
                    }
                },
                required: ["id", "sceneNumber", "location", "time", "shots"]
            }
        }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  
  return JSON.parse(text) as ScriptScene[];
};

export const generateImage = async (apiKey: string, prompt: string, aspectRatio: string = "1:1"): Promise<string> => {
    const ai = getAIClient(apiKey);
    
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
            parts: [{ text: prompt }]
        },
        config: {
            imageConfig: {
                imageSize: "1K", 
                aspectRatio: aspectRatio
            }
        }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData && part.inlineData.data) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
    }

    throw new Error("No image data returned");
};