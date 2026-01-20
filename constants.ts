import { WorkflowTab, ProjectData, AspectRatio } from './types';

// New Professional Structure - The 4 Pillars of the "Asset Hub"
export const INITIAL_PROJECT_STRUCTURE = (projectName: string): any => ({
  id: 'root',
  name: projectName,
  type: 'folder',
  path: `/${projectName}`,
  children: [
    {
      id: 'source_root',
      name: '📖 Novel Archive / 原著归档',
      type: 'folder',
      isRoot: true,
      icon: '📖',
      path: `/${projectName}/Source`,
      children: [
        // Chapters will be created here
        { id: 'ch01', name: 'Chapter 1', type: 'file', icon: '📄', path: `/${projectName}/Source/Chapter 1`, content: '' }
      ]
    },
    {
      id: 'bible_root',
      name: '🌍 World Bible / 世界观设定',
      type: 'folder',
      isRoot: true, // Fixed node
      icon: '🌍',
      path: `/${projectName}/Bible`,
      children: []
    },
    {
      id: 'char_root',
      name: '👥 Character Cast / 角色档案',
      type: 'folder',
      isRoot: true, // Fixed node
      icon: '👥',
      path: `/${projectName}/Characters`,
      children: []
    },
    {
      id: 'ep_root',
      name: '🎬 Episode Production / 分集制作',
      type: 'folder',
      isRoot: true,
      icon: '🎬',
      path: `/${projectName}/Episodes`,
      children: [
        // Episodes will be populated here via sync_breakdown or addEpisode
      ]
    }
  ]
});

export const DEFAULT_PROJECT: ProjectData = {
  name: "New Comic Project",
  createdBy: "Anonymous",
  created: Date.now(),
  lastModified: Date.now(),
  version: "1.0",
  aspectRatio: AspectRatio.RATIO_16_9,
  fps: 24,
  globalStylePreset: "Japanese Anime (Cel Shaded) / 日系赛璐珞",
  globalStyleCustom: "",
  scriptData: {},
  characters: [],
  plotBreakdown: [],
  fileTree: INITIAL_PROJECT_STRUCTURE("New Comic Project")
};