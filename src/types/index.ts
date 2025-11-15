// Core types for the Loom application

export interface TreeNode {
  id: string;
  text: string;
  parentId: string | null;
  children: string[];
  created: number;
  modified: number;

  // Metadata
  bookmark?: boolean;
  archived?: boolean;
  visited?: boolean;
  chapter?: string;

  // Generation data
  tokens?: TokenData[];
  finishReason?: string;

  // Memory and prompts
  memory?: string;

  // Visualization
  collapsed?: boolean;
  position?: { x: number; y: number };
}

export interface TokenData {
  generatedToken: {
    token: string;
    logprob: number;
  };
  position: number;
  counterfactuals?: Record<string, number>;
}

export interface Tree {
  id: string;
  name: string;
  rootId: string;
  nodes: Record<string, TreeNode>;
  currentNodeId: string;
  created: number;
  modified: number;
}

export interface GenerationSettings {
  model: string;
  num_continuations: number;
  temperature: number;
}

export interface ModelConfig {
  name: string;
  type: 'openai' | 'openai-chat' | 'together' | 'llama-cpp' | 'custom';
  api_base?: string;
  api_key?: string;
  system_prompt?: string;
}

export interface Preferences {
  // Navigation
  reverse: boolean;
  walk: 'descendents' | 'leaves' | 'uniform';
  nav_tag: string;

  // Story frame
  editable: boolean;
  history_conflict: 'overwrite' | 'branch' | 'ask' | 'forbid';
  coloring: 'edit' | 'read' | 'none';
  bold_prompt: boolean;
  font_size: number;
  line_spacing: number;
  paragraph_spacing: number;

  // Saving
  revision_history: boolean;
  autosave: boolean;
  model_response: 'backup' | 'discard' | 'save';

  // Generation data
  prob: boolean;

  // Tree visualization
  node_text_truncate: number;

  // Theme
  darkMode: boolean;
}

export interface Workspace {
  side_pane: {
    open: boolean;
    modules: string[];
  };
  bottom_pane: {
    open: boolean;
    modules: string[];
  };
  buttons: string[];
  alt_textbox: boolean;
  show_search: boolean;
}

export interface AppState {
  trees: Record<string, Tree>;
  activeTreeId: string | null;
  preferences: Preferences;
  workspace: Workspace;
  generationSettings: GenerationSettings;
  modelConfigs: Record<string, ModelConfig>;
}

export interface GenerationResponse {
  completions: Array<{
    text: string;
    tokens: TokenData[];
    finishReason: string;
  }>;
  prompt: {
    text: string;
    tokens: TokenData[] | null;
  };
  id: string;
  model: string;
  timestamp: number;
}

export type ViewMode = 'read' | 'tree' | 'wavefunction';

export interface Tab {
  id: string;
  treeId: string;
  name: string;
  viewMode: ViewMode;
}
