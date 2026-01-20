import { GoogleGenAI, Type } from "@google/genai";
import { ScriptScene, ProjectBible, PlotBreakdownItem } from '../types';

// Helper to instantiate the client
const getAIClient = (apiKey: string) => new GoogleGenAI({ apiKey });

// Helper: Clean JSON String (Fixes Markdown/Code Block issues)
const cleanJsonString = (text: string): string => {
  if (!text) return "[]";
  // Remove markdown code blocks (```json ... ```)
  let clean = text.replace(/```json\s*/g, "").replace(/```/g, "");
  // Remove potential leading/trailing whitespace
  return clean.trim();
};

export class StoryAgent {
  private apiKey: string;
  private bible: ProjectBible | undefined;
  private language: 'en' | 'zh';

  constructor(apiKey: string, bible: ProjectBible | undefined, language: 'en' | 'zh' = 'en') {
    this.apiKey = apiKey;
    this.bible = bible;
    this.language = language;
  }

  /**
   * Step 1: generate_plot_breakdown
   * Role: Plot Architect
   * Task: Analyze novel text and break it down into episodes.
   */
  async generatePlotBreakdown(rawNovelText: string): Promise<PlotBreakdownItem[]> {
    const ai = getAIClient(this.apiKey);
    const model = "gemini-3-pro-preview"; // Use Pro for reasoning

    const langInstruction = this.language === 'zh' 
      ? "Output strictly in SIMPLIFIED CHINESE." 
      : "Output strictly in ENGLISH.";

    const systemInstruction = `
      You are a Plot Architect. Analyze this novel text. 
      Break it down into logical Episodes (TV Series structure). 
      For each episode, provide a 'Hook', 'Inciting Incident', and 'Climax'. 

      ${langInstruction}

      Output JSON list: [{'ep_num': 1, 'summary': '...'}, ...].
      
      Requirements:
      1. Each Episode must have a distinct narrative arc.
      2. Aim for 3-5 episodes based on the text length provided.
    `;

    const response = await ai.models.generateContent({
        model,
        contents: rawNovelText,
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        ep_num: { type: Type.INTEGER },
                        title: { type: Type.STRING },
                        summary: { type: Type.STRING, description: "Detailed episode summary" },
                        hook: { type: Type.STRING },
                        inciting_incident: { type: Type.STRING },
                        climax: { type: Type.STRING }
                    },
                    required: ["ep_num", "title", "summary", "hook", "inciting_incident", "climax"]
                }
            }
        }
    });

    if (!response.text) throw new Error("Agent failed to generate breakdown.");
    
    try {
        const cleaned = cleanJsonString(response.text);
        return JSON.parse(cleaned) as PlotBreakdownItem[];
    } catch (e) {
        console.error("JSON Parse Error in Breakdown:", response.text);
        throw new Error("Failed to parse AI response. See console for raw output.");
    }
  }

  /**
   * Step 2: write_episode_script
   * Role: Screenwriter
   * Task: Write detailed Scene/Shot table.
   */
  async writeEpisodeScript(episodeSummary: PlotBreakdownItem, rawTextSegment: string, previousEpSummary?: string): Promise<ScriptScene[]> {
    const ai = getAIClient(this.apiKey);
    const model = "gemini-3-pro-preview";

    const langInstruction = this.language === 'zh' 
      ? "Output descriptions/dialogue in CHINESE. Visual Prompts MUST be in ENGLISH." 
      : "Output strictly in ENGLISH.";

    // Context Injection
    let context = "";
    if (this.bible) {
        context = `
        [WORLD RULES]: ${this.bible.worldview}
        [ART STYLE]: ${this.bible.artStyleKeywords}
        [CHARACTERS]: ${this.bible.characters.map(c => `${c.name} (${c.personality})`).join(', ')}
        `;
    }

    // Input Composition (Summary + Optional Detail)
    const detailedInput = rawTextSegment ? `[DETAILED SOURCE TEXT]:\n${rawTextSegment}` : "[NO DETAILED TEXT PROVIDED - EXPAND FROM SUMMARY]";

    const systemInstruction = `
      You are a Screenwriter. Based on this summary and the optional detailed text, write a standard script. 
      Focus on visual storytelling. Output standard JSON format.
      
      [CONTEXT - PREVIOUS EPISODE SUMMARY (CONTINUITY)]:
      ${previousEpSummary || "N/A - This is the first episode."}

      [CONTEXT - CURRENT EPISODE]:
      Title: ${episodeSummary.title}
      Summary: ${episodeSummary.summary}
      Climax to build towards: ${episodeSummary.climax}
      
      ${context}

      ${langInstruction}
      
      Rules:
      1. Convert the input into visual SCENES and SHOTS.
      2. 'prompt' must be a comma-separated list of visual tags for AI image generation (e.g. "cinematic lighting, close up, angry expression").
      3. 'shotType' should be standard (Wide, MCU, CU, OTS).
    `;

    const response = await ai.models.generateContent({
        model,
        contents: detailedInput, 
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

    if (!response.text) throw new Error("Agent failed to write script.");

    try {
        const cleaned = cleanJsonString(response.text);
        return JSON.parse(cleaned) as ScriptScene[];
    } catch (e) {
        console.error("JSON Parse Error in Script Generation:", response.text);
        throw new Error("Failed to parse script JSON. The AI might have included markdown.");
    }
  }

  /**
   * Step 3: review_and_fix
   * Role: Script Editor (Aligner)
   * Task: Review script against Bible for OOC and pacing.
   */
  async reviewAndFixScript(script: ScriptScene[]): Promise<ScriptScene[]> {
    const ai = getAIClient(this.apiKey);
    const model = "gemini-3-pro-preview";

    if (!this.bible) return script;

    const systemInstruction = `
      You are a Script Editor. Review this script against the Character Bible.
      
      Bible Context:
      - Characters: ${JSON.stringify(this.bible.characters)}
      
      Check for: 
      1. OOC (Out of Character). 
      2. Pacing issues. 
      
      If PASS, return original JSON. 
      If FAIL, rewrite the problematic scenes and return fixed JSON.
    `;

    // Pass script as string content
    const response = await ai.models.generateContent({
        model,
        contents: JSON.stringify(script),
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            // Reuse the same schema structure as output
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

     if (!response.text) return script; 
     
     try {
        const cleaned = cleanJsonString(response.text);
        return JSON.parse(cleaned) as ScriptScene[];
     } catch (e) {
         console.warn("Review step JSON failed, returning original script.");
         return script;
     }
  }
}