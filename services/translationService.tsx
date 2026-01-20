import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type Language = 'en' | 'zh';

const LANGUAGE_STORAGE_KEY = 'comicflow_language_pref';

const translations = {
  en: {
    app_title: "ComicFlow",
    tab_planning: "1. Planning",
    tab_cast: "2. Cast",
    tab_scripting: "3. Scripting",
    tab_visualizing: "4. Visualizing",
    tab_deliver: "5. Deliver",
    
    // ... existing ...
    ratio: "Ratio",
    export: "Export",
    project_settings: "Project Settings",
    global_settings: "Global Settings",
    api_key_label: "Gemini API Key",
    api_key_required: "API Key Required",
    save: "Save Changes",
    cancel: "Cancel",
    project_browser: "Project Explorer",
    storage_usage: "Storage Usage",
    raw_script: "Raw Script",
    analyze_script: "Analyze Script (Step 2)",
    analyzing: "Analyzing...",
    processing: "Processing...",
    breakdown: "Breakdown",
    no_script_data: "No script data yet. Go to Planning to breakdown your story, or write locally.",
    scene: "SCENE",
    header_num: "#",
    header_action: "Action",
    header_dialogue: "Dialogue",
    header_prompt: "Visual Prompt (AI)",
    header_shot_type: "Shot Type",
    header_audio: "Audio Prompt",
    char_forge_title: "Character Forge",
    char_forge_desc: "Define your characters here to ensure consistency across generated shots.",
    add_character: "+ Add New Character",
    empty_slot: "Empty Slot",
    export_nle: "Export to NLE",
    export_xml: "Export XML (DaVinci Resolve)",
    render_preview: "Render Preview",
    timeline_coming_soon: "Timeline View (Coming Soon in Phase 3)",
    audio_coming_soon: "Audio Module - Coming Phase 4",
    lang_toggle: "中/En",
    paste_script: "Paste your novel text here...",
    
    welcome_title: "Welcome to ComicFlow",
    recent_projects: "Recent Projects",
    btn_new_project: "New Project",
    btn_open_project: "Open Project",
    lbl_proj_name: "Project Name",
    lbl_proj_path: "Location",
    create: "Create",
    select_location: "Select Location",
    msg_save_success: "Project Saved Successfully",
    no_recent_projects: "No recent projects found.",

    title_login: "Login / Register",
    lbl_username: "Username",
    lbl_password: "Password",
    lbl_apikey: "Gemini API Key",
    btn_login: "Login",
    btn_register: "Register",
    btn_debug: "⚡ Debug (Skip)",
    msg_login_fail: "Invalid username or password",
    msg_user_exists: "Username already exists",
    login_tab: "Login",
    register_tab: "Register",

    menu_file: "File",
    menu_edit: "Edit",
    menu_view: "View",
    menu_help: "Help",
    act_new: "New Project",
    act_open: "Open Project",
    act_save: "Save Project",
    act_settings: "Settings",
    act_exit: "Exit",
    act_undo: "Undo",
    act_redo: "Redo",
    act_cut: "Cut",
    act_copy: "Copy",
    act_paste: "Paste",
    act_fullscreen: "Toggle Fullscreen",
    act_lang: "Switch Language",
    act_about: "About ComicFlow",
    
    about_title: "About ComicFlow",
    about_version: "Version 1.0.0",
    about_desc: "A professional AI Comic Video Creation Tool.",
    close: "Close",

    tab_bible: "Series Bible",
    tab_breakdown: "Plot Breakdown",
    tab_screenplay: "Screenplay",
    btn_extract_bible: "Analyze Novel & Create Bible",
    lbl_worldview: "World View",
    lbl_char_list: "Character List",
    lbl_ep_summaries: "Episode Summaries",
    lbl_source_text: "Source Novel Text (Full)",
    lbl_select_ep: "Select Episode to Adapt",
    lbl_ep_text: "Episode Raw Text",
    msg_bible_generating: "Extracting World & Characters...",
    msg_bible_generated: "Bible Generated Successfully!",
    
    step1_breakdown: "Step 1: Narrative Breakdown",
    step1_desc: "AI will analyze your source text and suggest logical episode breaks.",
    btn_batch_breakdown: "⚡ Batch Breakdown",
    generate_script_step2: "Step 2: Generate Script",
    regenerate_script: "Regenerate Script",
    no_breakdown: "No breakdown yet. Paste text in the Bible tab and click Batch Breakdown.",
    err_no_text: "Please enter text to adapt.",
    err_no_text_bible: "Please enter source text in the Bible tab first.",

    // Visualizing
    regenerate_image: "Regenerate Image",
    scene_card: "Scene Card",
    no_visual_data: "No shots found for this episode. Go to 'Scripting' to generate shots first.",

    // Script & Audio
    btn_batch_audio: "🎙️ Batch Generate Audio",
    msg_audio_generating: "Generating Audio...",

    // Character Module
    lbl_global_style: "🎨 Global Art Style",
    lbl_style_preset: "Style Preset:",
    lbl_style_custom: "Additional Style Tags:",
    placeholder_style: "e.g., vintage, film grain, muted colors...",
  },
  zh: {
    app_title: "漫流 AI",
    tab_planning: "1. 策划",
    tab_cast: "2. 选角",
    tab_scripting: "3. 编剧",
    tab_visualizing: "4. 视觉化",
    tab_deliver: "5. 交付",

    // ... existing ...
    ratio: "画幅",
    export: "导出",
    project_settings: "项目设置",
    global_settings: "全局设置",
    api_key_label: "Gemini API 密钥",
    api_key_required: "请先设置 API Key",
    save: "保存更改",
    cancel: "取消",
    project_browser: "项目浏览器",
    storage_usage: "存储使用量",
    raw_script: "原始剧本",
    analyze_script: "生成分镜脚本 (第二步)",
    analyzing: "分析中...",
    processing: "处理中...",
    breakdown: "剧情拆解",
    no_script_data: "暂无剧本数据。请前往‘策划’标签页拆解剧情，或在‘编剧’标签页编写。",
    scene: "场景",
    header_num: "序号",
    header_action: "动作/描述",
    header_dialogue: "对白",
    header_prompt: "AI 提示词",
    header_shot_type: "景别",
    header_audio: "音频提示",
    char_forge_title: "角色工坊",
    char_forge_desc: "在此定义角色以确保生成画面的一致性。",
    add_character: "+ 新建角色",
    empty_slot: "空位",
    export_nle: "导出至非编软件",
    export_xml: "导出 XML (达芬奇)",
    render_preview: "渲染预览",
    timeline_coming_soon: "时间轴视图 (第三阶段即将推出)",
    audio_coming_soon: "音频模块 - 第四阶段即将推出",
    lang_toggle: "En/中",
    paste_script: "在此粘贴小说文本...",

    welcome_title: "欢迎使用漫流 AI",
    recent_projects: "最近打开的项目",
    btn_new_project: "新建项目",
    btn_open_project: "打开项目",
    lbl_proj_name: "项目名称",
    lbl_proj_path: "存储路径",
    create: "创建",
    select_location: "选择路径",
    msg_save_success: "项目保存成功",
    no_recent_projects: "暂无最近项目",

    title_login: "登录 / 注册",
    lbl_username: "用户名",
    lbl_password: "密码",
    lbl_apikey: "Gemini API 密钥",
    btn_login: "登录",
    btn_register: "注册",
    btn_debug: "⚡ 开发调试 (跳过登录)",
    msg_login_fail: "用户名或密码错误",
    msg_user_exists: "用户名已存在",
    login_tab: "登录",
    register_tab: "注册",

    menu_file: "文件",
    menu_edit: "编辑",
    menu_view: "视图",
    menu_help: "帮助",
    act_new: "新建项目",
    act_open: "打开项目",
    act_save: "保存项目",
    act_settings: "设置",
    act_exit: "退出",
    act_undo: "撤销",
    act_redo: "重做",
    act_cut: "剪切",
    act_copy: "复制",
    act_paste: "粘贴",
    act_fullscreen: "切换全屏",
    act_lang: "切换语言",
    act_about: "关于 漫流 AI",
    
    about_title: "关于 漫流 AI",
    about_version: "版本 1.0.0",
    about_desc: "专业的 AI 漫改视频创作工具。",
    close: "关闭",

    tab_bible: "原著与设定",
    tab_breakdown: "剧情拆解",
    tab_screenplay: "分集剧本",
    btn_extract_bible: "提炼世界观与大纲",
    lbl_worldview: "世界观设定",
    lbl_char_list: "人物设定表",
    lbl_ep_summaries: "分集大纲",
    lbl_source_text: "原著小说 (全文)",
    lbl_select_ep: "选择剧集",
    lbl_ep_text: "本集原文",
    msg_bible_generating: "正在提炼世界观与人物...",
    msg_bible_generated: "设定集生成成功！",

    step1_breakdown: "第一步：剧情批量拆解",
    step1_desc: "AI 将分析原著长文本，并建议逻辑分集点。",
    btn_batch_breakdown: "⚡ 批量拆解剧情",
    generate_script_step2: "第二步：生成剧本",
    regenerate_script: "重新生成",
    no_breakdown: "暂无拆解数据。请在“原著与设定”标签页粘贴文本并点击批量拆解。",
    err_no_text: "请输入需要改编的文本。",
    err_no_text_bible: "请先在原著标签页输入源文本。",

    regenerate_image: "重新生成图片",
    scene_card: "场景卡片",
    no_visual_data: "该集暂无分镜数据。请先在‘编剧’页面生成镜头。",

    // Script & Audio
    btn_batch_audio: "🎙️ 批量生成配音",
    msg_audio_generating: "正在生成语音...",

    // Character Module
    lbl_global_style: "🎨 全局画风设定",
    lbl_style_preset: "预设风格:",
    lbl_style_custom: "额外风格标签:",
    placeholder_style: "例如：复古、胶片颗粒、低饱和度...",
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations['en']) => string;
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize language from LocalStorage, defaulting to 'zh' (Chinese)
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const savedLang = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (savedLang === 'en' || savedLang === 'zh') {
        return savedLang;
      }
    } catch (e) {
      console.warn('Failed to read language preference', e);
    }
    return 'zh';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch (e) {
      console.warn('Failed to save language preference', e);
    }
  };

  const t = (key: keyof typeof translations['en']) => {
    return translations[language][key] || key;
  };

  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'zh' : 'en';
    setLanguage(newLang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};