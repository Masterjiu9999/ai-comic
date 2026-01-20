import React, { createContext, useContext, useState, useEffect } from 'react';
import { ProjectData, WorkflowTab, ProjectContextType, ScriptScene, Character, FileNode, ProjectBible, EpisodeSummary, PlotBreakdownItem } from '../types';
import { DEFAULT_PROJECT, INITIAL_PROJECT_STRUCTURE } from '../constants';
import { useAuth } from './authService';
import { verifyEpisodeAssets, getAssetPath } from './assetService';
import { generateImage } from './geminiService';

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [project, setProject] = useState<ProjectData>(DEFAULT_PROJECT);
  const [currentTab, setTab] = useState<WorkflowTab>(WorkflowTab.PLANNING);
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<number | null>(1); // Default to EP01
  const [activeScriptContext, setActiveScriptContext] = useState<string>("");

  useEffect(() => {
    if (!currentUser) {
      setIsLoaded(false);
      setProject(DEFAULT_PROJECT);
    }
  }, [currentUser]);

  const updateProjectSettings = (settings: Partial<ProjectData>) => {
    setProject(prev => ({ ...prev, ...settings, lastModified: Date.now() }));
  };

  const updateProjectBible = (bible: ProjectBible) => {
    setProject(prev => ({ ...prev, bible, lastModified: Date.now() }));
  };

  const updateScriptData = (episodeId: number, scenes: ScriptScene[]) => {
    const verifiedScenes = verifyEpisodeAssets(scenes) as ScriptScene[];
    setProject(prev => ({
      ...prev,
      scriptData: {
          ...prev.scriptData,
          [episodeId]: verifiedScenes
      },
      lastModified: Date.now()
    }));
  };

  const updatePlotBreakdown = (items: PlotBreakdownItem[]) => {
      setProject(prev => ({
          ...prev,
          plotBreakdown: items,
          lastModified: Date.now()
      }));
  };

  const addCharacter = (char: Character) => {
    setProject(prev => ({
      ...prev,
      characters: [...prev.characters, char],
      lastModified: Date.now()
    }));
  };

  const getAssetUrl = (path: string) => undefined;

  const createProject = (name: string) => {
    if (!currentUser) return;
    const newProject: ProjectData = {
        ...DEFAULT_PROJECT,
        name: name,
        createdBy: currentUser.username,
        created: Date.now(),
        lastModified: Date.now(),
        apiKey: currentUser.apiKey,
        fileTree: INITIAL_PROJECT_STRUCTURE(name),
        plotBreakdown: []
    };
    setProject(newProject);
    setIsLoaded(true);
    setSelectedEpisodeId(1);
    setActiveScriptContext("");
  };

  const loadProject = (data?: any) => {
      if (data) {
          const verifiedData = { ...data };
          Object.keys(verifiedData.scriptData || {}).forEach(key => {
              const epId = Number(key);
              verifiedData.scriptData[epId] = verifyEpisodeAssets(verifiedData.scriptData[epId]);
          });
          setProject(verifiedData);
      } else if (currentUser && !project.apiKey) {
          setProject(prev => ({ ...prev, apiKey: currentUser.apiKey }));
      }
      setIsLoaded(true);
      setSelectedEpisodeId(1); // Reset selection on load
      setActiveScriptContext("");
  };

  const saveProject = () => {
      try {
          const finalProject = { ...project };
           Object.keys(finalProject.scriptData || {}).forEach(key => {
              const epId = Number(key);
              finalProject.scriptData[epId] = verifyEpisodeAssets(finalProject.scriptData[epId]);
          });

          const data = JSON.stringify(finalProject, null, 2);
          const blob = new Blob([data], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${project.name.replace(/\s+/g, '_')}.comicproj`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
      } catch (e) {
          console.error("Failed to save project JSON", e);
      }
  };

  const closeProject = () => {
    setProject(DEFAULT_PROJECT);
    setIsLoaded(false);
  };

  const updateChildPaths = (node: FileNode, newParentPath: string): FileNode => {
    const newPath = `${newParentPath}/${node.name}`;
    return {
      ...node,
      path: newPath,
      children: node.children ? node.children.map(c => updateChildPaths(c, newPath)) : undefined
    };
  };

  const renumberEpisodes = (prev: ProjectData): ProjectData => {
    const newTree = JSON.parse(JSON.stringify(prev.fileTree)) as FileNode;
    // TARGET: ep_root
    const episodesRoot = newTree.children?.find(c => c.id === 'ep_root');
    
    if (!episodesRoot || !episodesRoot.children) return prev;

    const episodeNodes = episodesRoot.children.filter(c => c.name.startsWith('EP'));
    const otherNodes = episodesRoot.children.filter(c => !c.name.startsWith('EP'));

    const sortedEpisodes = [...episodeNodes].sort((a, b) => a.name.localeCompare(b.name));

    const newScriptData: Record<number, ScriptScene[]> = {};
    const newEpisodeSummaries: EpisodeSummary[] = [];
    
    const renumberedEpisodes = sortedEpisodes.map((node, index) => {
      const epMatch = node.name.match(/^(EP\d+)(.*)$/);
      const oldNum = epMatch ? parseInt(epMatch[1].replace('EP', '')) : 0;
      const suffix = epMatch ? epMatch[2] : ""; 
      
      const nextNum = index + 1;
      const nextNumStr = nextNum.toString().padStart(2, '0');
      const newName = `EP${nextNumStr}${suffix}`;
      const newId = `ep${nextNumStr}`;
      const newPath = `${episodesRoot.path}/${newName}`;

      if (prev.scriptData[oldNum]) {
        newScriptData[nextNum] = prev.scriptData[oldNum];
      }

      if (prev.bible?.episodeSummaries) {
         const summary = prev.bible.episodeSummaries.find(s => s.id === oldNum);
         if (summary) {
             newEpisodeSummaries.push({ ...summary, id: nextNum });
         }
      }

      return {
        ...node,
        id: newId,
        name: newName,
        path: newPath,
        children: [] // Ensuring flat structure on renumber
      } as FileNode;
    });

    episodesRoot.children = [...renumberedEpisodes, ...otherNodes];

    return {
        ...prev,
        fileTree: newTree,
        scriptData: newScriptData,
        bible: prev.bible ? { ...bibleData(prev.bible, newEpisodeSummaries) } : prev.bible,
        lastModified: Date.now()
    };
  };

  const bibleData = (oldBible: ProjectBible, newSummaries: EpisodeSummary[]): ProjectBible => ({
    ...oldBible,
    episodeSummaries: newSummaries
  });

  const addEpisode = () => {
    setProject(prev => {
      const updatedProject = renumberEpisodes(prev);
      const cleanTree = updatedProject.fileTree;
      // TARGET: ep_root
      const cleanEpisodesRoot = cleanTree.children?.find(c => c.id === 'ep_root')!;

      const existingEps = cleanEpisodesRoot.children!.filter(c => c.name.startsWith('EP'));
      const nextNum = existingEps.length + 1;
      const nextNumStr = nextNum.toString().padStart(2, '0');
      const epName = `EP${nextNumStr}`;
      const epId = `ep${nextNumStr}`;

      const newEp: FileNode = {
        id: epId,
        name: epName,
        type: 'folder',
        icon: '🎬',
        path: `${cleanEpisodesRoot.path}/${epName}`,
        children: [] // Simplified structure
      };

      cleanEpisodesRoot.children = [...cleanEpisodesRoot.children!, newEp];

      const newBible = updatedProject.bible ? {
          ...updatedProject.bible,
          episodeSummaries: [
              ...updatedProject.bible.episodeSummaries,
              { id: nextNum, summary: "New Episode", key_events: "" }
          ]
      } : undefined;

      return { ...updatedProject, fileTree: cleanTree, bible: newBible, lastModified: Date.now() };
    });
  };

  const deleteFileNode = (id: string) => {
    setProject(prev => {
      const findNode = (nodes: FileNode[]): FileNode | null => {
        for (const node of nodes) {
          if (node.id === id) return node;
          if (node.children) {
            const found = findNode(node.children);
            if (found) return found;
          }
        }
        return null;
      };

      const nodeToDelete = findNode(prev.fileTree.children || []);
      if (!nodeToDelete) return prev;
      if (nodeToDelete.isRoot) return prev;

      const deleteRecursive = (nodes: FileNode[]): FileNode[] => {
        return nodes
          .filter(node => node.id !== id)
          .map(node => ({
            ...node,
            children: node.children ? deleteRecursive(node.children) : undefined
          }));
      };

      const treeAfterDeletion = {
        ...prev.fileTree,
        children: deleteRecursive(prev.fileTree.children || [])
      };

      const intermediateProject = { ...prev, fileTree: treeAfterDeletion };
      const isEpisode = nodeToDelete.name.startsWith('EP') && nodeToDelete.type === 'folder';
      
      return isEpisode ? renumberEpisodes(intermediateProject) : { ...intermediateProject, lastModified: Date.now() };
    });
  };

  const renameEpisodeSuffix = (nodeId: string, newSuffix: string) => {
    setProject(prev => {
      const newTree = JSON.parse(JSON.stringify(prev.fileTree)) as FileNode;
      const findAndUpdate = (nodes: FileNode[]): boolean => {
        for (let i = 0; i < nodes.length; i++) {
          if (nodes[i].id === nodeId) {
            const currentName = nodes[i].name;
            const prefixMatch = currentName.match(/^(EP\d+)/);
            if (prefixMatch) {
              const prefix = prefixMatch[1];
              const cleanSuffix = newSuffix.trim() ? ` - ${newSuffix.trim()}` : "";
              nodes[i].name = `${prefix}${cleanSuffix}`;
              
              const pathParts = nodes[i].path.split('/');
              pathParts.pop();
              const parentPath = pathParts.join('/');
              nodes[i].path = `${parentPath}/${nodes[i].name}`;
              return true;
            }
          }
          if (nodes[i].children && findAndUpdate(nodes[i].children!)) return true;
        }
        return false;
      };

      findAndUpdate(newTree.children || []);
      return { ...prev, fileTree: newTree, lastModified: Date.now() };
    });
  };

  // --- NEW: Sync Breakdown to File Structure ---
  const syncEpisodesFromBreakdown = (items: PlotBreakdownItem[]) => {
      setProject(prev => {
          const newTree = JSON.parse(JSON.stringify(prev.fileTree)) as FileNode;
          const epRoot = newTree.children?.find(c => c.id === 'ep_root');
          
          if (!epRoot) return prev;
          if (!epRoot.children) epRoot.children = [];

          items.forEach(item => {
              const epNumStr = item.ep_num.toString().padStart(2, '0');
              const folderName = `EP${epNumStr}`;
              const fullFolderName = `EP${epNumStr} - ${item.title}`;
              const id = `ep${epNumStr}`;
              
              // Check if folder exists by ID
              const existing = epRoot.children!.find(c => c.id === id);
              if (existing) {
                  // Update name if changed
                  if (existing.name !== fullFolderName) {
                      existing.name = fullFolderName;
                      // Update path
                      const parentPath = epRoot.path;
                      existing.path = `${parentPath}/${fullFolderName}`;
                  }
              } else {
                  // Create new folder
                  const newFolder: FileNode = {
                      id: id,
                      name: fullFolderName,
                      type: 'folder',
                      icon: '🎬',
                      path: `${epRoot.path}/${fullFolderName}`,
                      children: []
                  };
                  epRoot.children!.push(newFolder);
              }
          });
          
          // Sort to be safe
          epRoot.children.sort((a: FileNode, b: FileNode) => a.name.localeCompare(b.name));

          return { ...prev, fileTree: newTree, lastModified: Date.now() };
      });
  };

  // --- NEW: Create Novel Chapter ---
  const createNovelChapter = (title: string, content: string = "") => {
      setProject(prev => {
          const newTree = JSON.parse(JSON.stringify(prev.fileTree)) as FileNode;
          const sourceRoot = newTree.children?.find(c => c.id === 'source_root');
          
          if (!sourceRoot) return prev;
          if (!sourceRoot.children) sourceRoot.children = [];

          const id = `ch_${Date.now()}`;
          const newFile: FileNode = {
              id: id,
              name: title,
              type: 'file',
              icon: '📄',
              path: `${sourceRoot.path}/${title}`,
              content: content
          };

          sourceRoot.children.push(newFile);
          return { ...prev, fileTree: newTree, lastModified: Date.now() };
      });
  };

  const generateShotAsset = async (episodeId: number, sceneId: string, shotId: string, assetType: 'start_frame' | 'end_frame' | 'audio') => {
      if (!project.apiKey) {
          alert("API Key required for generation.");
          return;
      }
      
      const scenes = project.scriptData[episodeId] || [];
      const scene = scenes.find(s => s.id === sceneId);
      const shot = scene?.shots.find(s => s.id === shotId);
      
      if (!shot) return;

      let assetData = "";

      if (assetType === 'start_frame' || assetType === 'end_frame') {
          try {
             assetData = await generateImage(project.apiKey, shot.prompt);
          } catch(e) {
              console.error(e);
              assetData = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzMzMyIgLz48dGV4dCB4PSI1MCIgeT0iNTAiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM2NjYiPkltYWdlPC90ZXh0Pjwvc3ZnPg==";
          }
      } else if (assetType === 'audio') {
          assetData = "data:audio/wav;base64,UklGRiQA..."; 
      }

      const newScenes = scenes.map(s => {
          if (s.id !== sceneId) return s;
          return {
              ...s,
              shots: s.shots.map(sh => {
                  if (sh.id !== shotId) return sh;
                  const newAssets = { ...sh.assets, [assetType]: assetData };
                  return { ...sh, assets: newAssets };
              })
          }
      });

      updateScriptData(episodeId, newScenes);
  };

  return (
    <ProjectContext.Provider value={{
      project, currentTab, isLoaded, selectedEpisodeId, activeScriptContext, setActiveScriptContext, setSelectedEpisodeId, setTab, updateProjectSettings, updateProjectBible,
      updateScriptData, updatePlotBreakdown, addCharacter, getAssetUrl, createProject, loadProject,
      saveProject, closeProject, addEpisode, deleteFileNode, renameEpisodeSuffix, generateShotAsset,
      createNovelChapter, syncEpisodesFromBreakdown
    }}>
      {children}
    </ProjectContext.Provider>
  );
};