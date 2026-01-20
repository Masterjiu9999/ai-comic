import React, { useState, useEffect, useRef } from 'react';
import { useProject } from '../../services/projectService';
import { useTranslation } from '../../services/translationService';
import { FileNode, WorkflowTab } from '../../types';

interface FileTreeItemProps {
  node: FileNode;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, node: FileNode) => void;
  depth?: number;
}

const FileTreeItem: React.FC<FileTreeItemProps> = ({ node, selectedId, onSelect, onContextMenu, depth = 0 }) => {
  const { setSelectedEpisodeId, setTab, updateProjectBible, project } = useProject();
  const [isExpanded, setIsExpanded] = useState(true);
  const isFolder = node.type === 'folder';
  const isSelected = selectedId === node.id;

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleItemClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(node.id);
    
    // --- Logic for 4 Pillars Navigation ---
    if (node.id === 'bible_root') {
       setTab(WorkflowTab.PLANNING);
    } 
    else if (node.id === 'char_root') {
       setTab(WorkflowTab.CAST);
    } 
    else if (node.id === 'ep_root') {
       // Just expand/collapse logic
    }
    // Episode Click
    else if (node.name.startsWith('EP') && node.path.includes('Episodes')) {
       const epMatch = node.name.match(/^(EP\d+)/);
       if (epMatch) {
         const epNum = parseInt(epMatch[1].replace('EP', ''));
         setSelectedEpisodeId(epNum);
         setTab(WorkflowTab.SCRIPTING);
       }
    } 
    // Chapter Click (Novel Archive)
    else if (node.path.includes('Source') && node.type === 'file') {
        if (node.content && project.bible) {
            updateProjectBible({ ...project.bible, sourceText: node.content });
            setTab(WorkflowTab.PLANNING); // Go to Bible Tab to view
        }
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFolder) {
      setIsExpanded(!isExpanded);
    }
  };

  const getIcon = () => {
    if (node.icon) return node.icon;
    if (isFolder) return isExpanded ? '📂' : '📁';
    const ext = node.name.split('.').pop()?.toLowerCase();
    if (['png', 'jpg', 'jpeg', 'webp'].includes(ext || '')) return '🖼️';
    return '📄';
  };

  const paddingLeft = `${depth * 16 + 12}px`;

  return (
    <div className="select-none">
      <div 
        className={`flex items-center py-2 cursor-pointer border-l-4 group transition-colors duration-75 outline-none ${
          isSelected 
            ? 'bg-[#e65100] border-orange-400 text-white shadow-inner' 
            : 'bg-transparent border-transparent text-gray-400 hover:bg-[#3d3d3d] hover:text-gray-200'
        }`}
        style={{ paddingLeft }}
        onClick={handleItemClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={(e) => onContextMenu(e, node)}
      >
        <div 
          className="w-5 h-5 flex items-center justify-center mr-1 transition-colors hover:text-white"
          onClick={handleToggleExpand}
        >
          {isFolder && (
            <span className={`text-[10px] transition-transform duration-200 ${isExpanded ? 'rotate-90' : 'rotate-0'}`}>
              ▶
            </span>
          )}
        </div>

        <span className="mr-2 text-sm grayscale group-hover:grayscale-0 transition-all">{getIcon()}</span>

        <span className={`truncate text-xs ${node.isRoot ? 'font-black uppercase tracking-widest text-[10px] opacity-80' : 'font-semibold'}`}>
          {node.name}
        </span>
      </div>

      {isFolder && isExpanded && node.children && (
        <div className="overflow-hidden animate-in slide-in-from-left-2 duration-150">
          {node.children.map(child => (
            <FileTreeItem 
              key={child.id} 
              node={child} 
              depth={depth + 1} 
              selectedId={selectedId} 
              onSelect={onSelect} 
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const Sidebar: React.FC = () => {
  const { project, addEpisode, deleteFileNode, renameEpisodeSuffix, createNovelChapter } = useProject();
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, node: FileNode } | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleGlobalClick = () => setContextMenu(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, node: FileNode) => {
    e.preventDefault();
    setSelectedId(node.id);
    setContextMenu({ x: e.pageX, y: e.pageY, node });
  };

  const handleRenameSuffix = () => {
    if (contextMenu) {
      const isEpisode = contextMenu.node.name.startsWith('EP');
      if (!isEpisode) {
        alert("Rename Suffix is only available for Episode folders.");
        return;
      }
      const currentName = contextMenu.node.name;
      const suffixMatch = currentName.match(/^EP\d+\s*-\s*(.*)$/);
      const currentSuffix = suffixMatch ? suffixMatch[1] : "";
      
      const newSuffix = prompt("Enter Episode Title (Suffix):", currentSuffix);
      if (newSuffix !== null) {
        renameEpisodeSuffix(contextMenu.node.id, newSuffix);
      }
      setContextMenu(null);
    }
  };

  const handleAddChapter = () => {
      if (contextMenu && contextMenu.node.id === 'source_root') {
          const title = prompt("Enter Chapter Title:", "Chapter X");
          if (title) {
              const content = prompt("Paste Chapter Content (Optional):", "");
              createNovelChapter(title, content || "");
          }
          setContextMenu(null);
      }
  };

  const performDelete = (id: string, name: string) => {
    if (id === 'root' || id.includes('root')) {
      alert("Protected folder cannot be deleted.");
      return;
    }
    const isEpisode = name.startsWith('EP');
    const msg = isEpisode 
      ? `Delete ${name}?\n\nThis closes the gap and preserves subsequent suffixes.` 
      : `Delete "${name}"?`;

    if (window.confirm(msg)) {
      deleteFileNode(id);
      setSelectedId(null);
    }
  };

  const handleDeleteAction = () => {
    if (contextMenu) {
      performDelete(contextMenu.node.id, contextMenu.node.name);
      setContextMenu(null);
    }
  };

  return (
    <div ref={sidebarRef} className="w-64 bg-[#0d1117] border-r border-gray-800 flex flex-col h-full shadow-2xl z-20 relative">
      
      <div className="p-3 border-b border-gray-800 bg-[#161b22] flex items-center justify-between">
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
          {t('project_browser')}
        </span>
        <div className="flex gap-1">
          <button 
            onClick={addEpisode}
            title="Add Episode"
            className="w-8 h-8 flex items-center justify-center rounded bg-gray-800 hover:bg-gray-700 text-brand-orange transition shadow-sm active:scale-90"
          >
            🎬<span className="text-[10px] font-bold">+</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1 custom-scrollbar">
        {project.fileTree.children?.map(node => (
          <FileTreeItem 
            key={node.id} 
            node={node} 
            selectedId={selectedId}
            onSelect={setSelectedId}
            onContextMenu={handleContextMenu}
          />
        ))}
      </div>

      {contextMenu && (
        <div 
          className="fixed bg-[#161b22] border border-gray-700 shadow-2xl rounded-lg py-1 w-52 z-[100] overflow-hidden"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase border-b border-gray-800 mb-1 flex items-center justify-between">
            <span className="truncate max-w-[120px]">{contextMenu.node.name}</span>
            <span className="text-[8px] text-brand-orange">Actions</span>
          </div>
          
          {/* Add Chapter (Only for Novel Archive) */}
          {contextMenu.node.id === 'source_root' && (
              <>
                <button 
                    onClick={handleAddChapter}
                    className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors text-gray-200 hover:bg-brand-blue hover:text-white"
                >
                    <span className="w-4 text-center">📄</span> Add Chapter
                </button>
                <div className="h-px bg-gray-800 my-1 mx-2"></div>
              </>
          )}

          <button 
            onClick={handleRenameSuffix}
            className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors ${contextMenu.node.name.startsWith('EP') ? 'text-gray-200 hover:bg-brand-blue hover:text-white' : 'text-gray-600 cursor-not-allowed'}`}
          >
            <span className="w-4 text-center">✏️</span> Rename (Add Suffix)
          </button>

          <div className="h-px bg-gray-800 my-1 mx-2"></div>

          <button 
            onClick={handleDeleteAction}
            className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors ${contextMenu.node.isRoot ? 'text-gray-600 cursor-not-allowed' : 'text-red-400 hover:bg-red-900 hover:text-white'}`}
            disabled={contextMenu.node.isRoot}
          >
            <span className="w-4 text-center">🗑️</span> Delete Episode/File
          </button>
        </div>
      )}

      <div className="p-3 bg-[#0d1117] border-t border-gray-800">
        <div className="flex justify-between items-center mb-1.5">
          <div className="text-[9px] font-black text-gray-500 uppercase tracking-tighter">{t('storage_usage')}</div>
          <div className="text-[10px] font-mono text-gray-400">12.4 MB</div>
        </div>
        <div className="w-full bg-gray-900 h-2 rounded-full overflow-hidden border border-gray-800">
          <div className="bg-gradient-to-r from-brand-orange to-orange-400 w-[15%] h-full shadow-[0_0_8px_rgba(249,115,22,0.4)] transition-all duration-500"></div>
        </div>
      </div>
    </div>
  );
};