import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { Preferences, Workspace, GenerationSettings, ModelConfig } from '@/types';

interface SettingsState {
  preferences: Preferences;
  workspace: Workspace;
  generationSettings: GenerationSettings;
  modelConfigs: Record<string, ModelConfig>;

  // Preferences
  updatePreferences: (updates: Partial<Preferences>) => void;
  toggleDarkMode: () => void;

  // Workspace
  updateWorkspace: (updates: Partial<Workspace>) => void;
  toggleSidePane: () => void;
  toggleBottomPane: () => void;

  // Generation settings
  updateGenerationSettings: (updates: Partial<GenerationSettings>) => void;

  // Model configs
  addModelConfig: (name: string, config: ModelConfig) => void;
  removeModelConfig: (name: string) => void;
  updateModelConfig: (name: string, updates: Partial<ModelConfig>) => void;
}

const defaultPreferences: Preferences = {
  reverse: false,
  walk: 'descendents',
  nav_tag: 'bookmark',
  editable: true,
  history_conflict: 'overwrite',
  coloring: 'edit',
  bold_prompt: true,
  font_size: 14,
  line_spacing: 8,
  paragraph_spacing: 10,
  revision_history: false,
  autosave: true,
  model_response: 'backup',
  prob: true,
  node_text_truncate: 150,
  darkMode: true,
};

const defaultWorkspace: Workspace = {
  side_pane: {
    open: true,
    modules: ['minimap'],
  },
  bottom_pane: {
    open: false,
    modules: [],
  },
  buttons: [
    'Edit',
    'Delete',
    'Generate',
    'New Child',
    'Next',
    'Prev',
    'Visualize',
    'Wavefunction',
    'Map',
  ],
  alt_textbox: false,
  show_search: false,
};

const defaultGenerationSettings: GenerationSettings = {
  model: 'gpt-4o-mini',
  num_continuations: 4,
  temperature: 0.8,
};

const defaultModelConfigs: Record<string, ModelConfig> = {
  'gpt-4o': {
    name: 'gpt-4o',
    provider: 'openai',
  },
  'gpt-4o-mini': {
    name: 'gpt-4o-mini',
    provider: 'openai',
  },
  'claude-3-5-sonnet-20241022': {
    name: 'claude-3-5-sonnet-20241022',
    provider: 'anthropic',
  },
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    immer((set) => ({
      preferences: defaultPreferences,
      workspace: defaultWorkspace,
      generationSettings: defaultGenerationSettings,
      modelConfigs: defaultModelConfigs,

      updatePreferences: (updates: Partial<Preferences>) => {
        set((state) => {
          Object.assign(state.preferences, updates);
        });
      },

      toggleDarkMode: () => {
        set((state) => {
          state.preferences.darkMode = !state.preferences.darkMode;
        });
      },

      updateWorkspace: (updates: Partial<Workspace>) => {
        set((state) => {
          Object.assign(state.workspace, updates);
        });
      },

      toggleSidePane: () => {
        set((state) => {
          state.workspace.side_pane.open = !state.workspace.side_pane.open;
        });
      },

      toggleBottomPane: () => {
        set((state) => {
          state.workspace.bottom_pane.open = !state.workspace.bottom_pane.open;
        });
      },

      updateGenerationSettings: (updates: Partial<GenerationSettings>) => {
        set((state) => {
          Object.assign(state.generationSettings, updates);
        });
      },

      addModelConfig: (name: string, config: ModelConfig) => {
        set((state) => {
          state.modelConfigs[name] = config;
        });
      },

      removeModelConfig: (name: string) => {
        set((state) => {
          delete state.modelConfigs[name];
        });
      },

      updateModelConfig: (name: string, updates: Partial<ModelConfig>) => {
        set((state) => {
          if (state.modelConfigs[name]) {
            Object.assign(state.modelConfigs[name], updates);
          }
        });
      },
    })),
    {
      name: 'loom-settings',
    }
  )
);
