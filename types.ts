export enum WorkflowTab {
  PLANNING = 'Planning',
  CAST = 'Cast', // New Stage 2
  SCRIPTING = 'Scripting',
  VISUALIZING = 'Visualizing',
  DELIVER = 'Deliver'
}

export enum AspectRatio {
  RATIO_16_9 = '16:9',
  RATIO_9_16 = '9:16',
  RATIO_235_1 = '2.35:1',
  OPEN_GATE = 'OpenGate'
}

export interface User {
  id: number;
  username: string;
  passwordHash: string; 
  apiKey: string;
  settings?: string; // JSON string for preferences
  createdAt?: number;
}

export interface BibleCharacter {
  name: string;
  age?: string; // New field
  role?: string; // New field (e.g. Protagonist, Antagonist)
  description: string;
  appearance: string;
  personality: string;
  visual_prompt: string; // Detailed physical tags for AI
  voice_type: string;    // e.g. "Male Deep", "Female Soft"
  
  // New Asset Fields
  portrait_path?: string;
  ref_sheet_path?: string;
  master_ref?: 'portrait' | 'sheet'; // Determines which image is sent to the storyboard generator
}

export interface EpisodeSummary {
  id: number;
  summary: string;
  key_events: string;
}

export interface ProjectBible {
  sourceText: string;
  worldview: string;
  artStyleKeywords: string; // Keywords for image generation style
  coreRules?: string;      // Magic/Tech system rules
  characters: BibleCharacter[];
  episodeSummaries: EpisodeSummary[];
}

export interface Character {
  id: string;
  name: string;
  description: string;
  imagePaths: {
    front?: string;
    side?: string;
    back?: string;
    sheet?: string;
  };
}

// New Type for Step 1: Breakdown
export interface PlotBreakdownItem {
  ep_num: number;
  title: string;
  summary: string;
  hook: string;
  inciting_incident: string;
  climax: string;
}

export interface ShotAssets {
  start_frame?: string; // Path or Base64 URL
  end_frame?: string;
  video?: string;
  audio?: string;
}

export interface ShotStatus {
  has_start: boolean;
  has_end: boolean;
  has_video: boolean;
  has_audio: boolean;
}

export interface ScriptShot {
  id: string;
  sceneId: string;
  shotNumber: number;
  shotType?: string; // e.g. Wide Shot, Close Up
  description: string;
  dialogue?: string;
  speaker?: string;
  prompt: string; // Visual Prompt
  duration?: string; // e.g. "4s"
  
  // New Asset-Centric Fields
  assets: ShotAssets;
  status: ShotStatus;

  // Deprecated flat fields (kept for migration if needed, but preferred to use assets.*)
  audioPrompt?: string; 
}

export interface ScriptScene {
  id: string;
  sceneNumber: number;
  location: string;
  time: string; // INT/EXT - DAY/NIGHT
  shots: ScriptShot[];
}

export interface ProjectData {
  name: string;
  createdBy: string; // username
  created: number;
  lastModified: number;
  version: string;
  aspectRatio: AspectRatio;
  fps: number; // 24 or 30
  apiKey?: string; // Stored in memory for session
  bible?: ProjectBible; // The Project Bible
  
  // Style Controls
  globalStylePreset?: string;
  globalStyleCustom?: string;

  // New: Store the Agent's Breakdown here
  plotBreakdown: PlotBreakdownItem[];

  // Mapped by Episode ID
  scriptData: Record<number, ScriptScene[]>; 
  characters: Character[];
  // File system simulation
  fileTree: FileNode;
}

export interface FileNode {
  id: string;
  name: string;
  type: 'folder' | 'file';
  isRoot?: boolean; // Fixed top-level nodes
  icon?: string;    // Emoji icon
  children?: FileNode[];
  content?: any; // For demo, we might store blob URLs or text here
  path: string;
}

export interface ProjectContextType {
  project: ProjectData;
  currentTab: WorkflowTab;
  isLoaded: boolean;
  selectedEpisodeId: number | null; // NEW: Track context
  activeScriptContext: string; // NEW: Holds the summary passed from Stage 1 to Stage 3
  setActiveScriptContext: (summary: string) => void;
  setSelectedEpisodeId: (id: number | null) => void; // NEW
  setTab: (tab: WorkflowTab) => void;
  updateProjectSettings: (settings: Partial<ProjectData>) => void;
  updateProjectBible: (bible: ProjectBible) => void;
  updateScriptData: (episodeId: number, scenes: ScriptScene[]) => void;
  updatePlotBreakdown: (items: PlotBreakdownItem[]) => void;
  addCharacter: (char: Character) => void;
  getAssetUrl: (path: string) => string | undefined;
  createProject: (name: string) => void;
  loadProject: (data?: any) => void;
  saveProject: () => void;
  closeProject: () => void;
  addEpisode: () => void;
  deleteFileNode: (id: string) => void;
  renameEpisodeSuffix: (nodeId: string, newSuffix: string) => void;
  generateShotAsset: (episodeId: number, sceneId: string, shotId: string, assetType: 'start_frame' | 'end_frame' | 'audio') => Promise<void>;
  
  // New Methods for Asset Hub Logic
  createNovelChapter: (title: string, content?: string) => void;
  syncEpisodesFromBreakdown: (items: PlotBreakdownItem[]) => void;
}

// --- Task Manager Types ---

export type TaskType = 'IMAGE_GEN' | 'TEXT_GEN' | 'AUDIO_GEN';

export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface TaskPayload {
  id: string;
  type: TaskType;
  description: string;
  status: TaskStatus;
  progress?: number; // 0-100
  error?: string;
  // The actual async work to perform
  execute: () => Promise<any>;
  // Optional callback when done
  onComplete?: (result: any) => void;
}

export interface TaskContextType {
  tasks: TaskPayload[];
  addTask: (type: TaskType, description: string, execute: () => Promise<any>, onComplete?: (result: any) => void) => void;
  cancelAll: () => void;
  activeCount: number;
}