import React, { useState } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import { X, Plus, Trash2, Save } from 'lucide-react';
import type { ModelConfig } from '@/types';

interface SettingsDialogProps {
  onClose: () => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({ onClose }) => {
  const { modelConfigs, generationSettings, updateGenerationSettings, addModelConfig, removeModelConfig, updateModelConfig } = useSettingsStore();

  const [editingModel, setEditingModel] = useState<string | null>(null);
  const [newModelName, setNewModelName] = useState('');
  const [newModelConfig, setNewModelConfig] = useState<Partial<ModelConfig>>({
    provider: 'openai',
    api_base: '',
    api_key: '',
  });

  const handleSaveModel = () => {
    if (!newModelName.trim()) {
      alert('Digite um nome para o modelo');
      return;
    }

    addModelConfig(newModelName, {
      name: newModelName,
      provider: newModelConfig.provider || 'openai',
      api_base: newModelConfig.api_base,
      api_key: newModelConfig.api_key,
      system_prompt: newModelConfig.system_prompt,
    });

    setNewModelName('');
    setNewModelConfig({ provider: 'openai', api_base: '', api_key: '' });
    setEditingModel(null);
  };

  const handleUpdateModel = (modelName: string, updates: Partial<ModelConfig>) => {
    updateModelConfig(modelName, updates);
  };

  const handleDeleteModel = (modelName: string) => {
    if (confirm(`Tem certeza que deseja excluir o modelo "${modelName}"?`)) {
      removeModelConfig(modelName);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background border border-border rounded-lg w-full max-w-4xl max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-background">
          <h2 className="text-xl font-semibold">Configurações</h2>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {/* Generation Settings */}
          <section>
            <h3 className="text-lg font-semibold mb-4">Configurações de Geração</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Modelo Padrão</label>
                <select
                  value={generationSettings.model}
                  onChange={(e) => updateGenerationSettings({ model: e.target.value })}
                  className="w-full p-2 bg-background border border-border rounded"
                >
                  {Object.keys(modelConfigs).map((modelName) => (
                    <option key={modelName} value={modelName}>
                      {modelName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Número de Continuações</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={generationSettings.num_continuations}
                  onChange={(e) => updateGenerationSettings({ num_continuations: parseInt(e.target.value) })}
                  className="w-full p-2 bg-background border border-border rounded"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2">
                  Temperature
                  <span className="text-xs text-muted-foreground ml-2">
                    (Quanto maior, mais criativo. Recomendado: 0.7-1.0)
                  </span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  value={generationSettings.temperature}
                  onChange={(e) => updateGenerationSettings({ temperature: parseFloat(e.target.value) })}
                  className="w-full p-2 bg-background border border-border rounded"
                />
              </div>
            </div>
          </section>

          {/* Model Configurations */}
          <section>
            <h3 className="text-lg font-semibold mb-4">Configurações de Modelos</h3>

            <div className="space-y-4">
              {Object.entries(modelConfigs).map(([modelName, config]) => (
                <div key={modelName} className="p-4 border border-border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{modelName}</h4>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingModel(editingModel === modelName ? null : modelName)}
                        className="p-1 hover:bg-accent rounded text-sm"
                      >
                        {editingModel === modelName ? 'Cancelar' : 'Editar'}
                      </button>
                      <button
                        onClick={() => handleDeleteModel(modelName)}
                        className="p-1 hover:bg-destructive/20 text-destructive rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {editingModel === modelName ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm mb-1">Provider</label>
                        <select
                          value={config.provider}
                          onChange={(e) => handleUpdateModel(modelName, { provider: e.target.value as any })}
                          className="w-full p-2 bg-background border border-border rounded text-sm"
                        >
                          <option value="openai">OpenAI</option>
                          <option value="anthropic">Anthropic</option>
                          <option value="ollama">Ollama</option>
                          <option value="custom">Custom (OpenAI-compatible)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm mb-1">API Base URL (opcional)</label>
                        <input
                          type="text"
                          value={config.api_base || ''}
                          onChange={(e) => handleUpdateModel(modelName, { api_base: e.target.value })}
                          placeholder="https://api.openai.com/v1"
                          className="w-full p-2 bg-background border border-border rounded text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm mb-1">API Key (opcional)</label>
                        <input
                          type="password"
                          value={config.api_key || ''}
                          onChange={(e) => handleUpdateModel(modelName, { api_key: e.target.value })}
                          placeholder="sk-..."
                          className="w-full p-2 bg-background border border-border rounded text-sm"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Se vazio, usará a variável de ambiente VITE_OPENAI_API_KEY
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm mb-1">System Prompt (opcional)</label>
                        <textarea
                          value={config.system_prompt || ''}
                          onChange={(e) => handleUpdateModel(modelName, { system_prompt: e.target.value })}
                          placeholder="Você é um assistente útil..."
                          rows={3}
                          className="w-full p-2 bg-background border border-border rounded text-sm resize-none"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Prompt do sistema para modelos de chat
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm space-y-1 text-muted-foreground">
                      <p>Provider: {config.provider}</p>
                      {config.api_base && <p>Base URL: {config.api_base}</p>}
                      <p>API Key: {config.api_key ? '••••••••' : 'Usando .env'}</p>
                      {config.system_prompt && <p>System Prompt: {config.system_prompt.substring(0, 50)}...</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add new model */}
            <div className="mt-4 p-4 border border-dashed border-border rounded-lg space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Plus size={16} />
                Adicionar Novo Modelo
              </h4>

              <div>
                <label className="block text-sm mb-1">Nome do Modelo</label>
                <input
                  type="text"
                  value={newModelName}
                  onChange={(e) => setNewModelName(e.target.value)}
                  placeholder="meu-modelo-customizado"
                  className="w-full p-2 bg-background border border-border rounded text-sm"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Provider</label>
                <select
                  value={newModelConfig.provider}
                  onChange={(e) => setNewModelConfig({ ...newModelConfig, provider: e.target.value as any })}
                  className="w-full p-2 bg-background border border-border rounded text-sm"
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="ollama">Ollama</option>
                  <option value="custom">Custom (OpenAI-compatible)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1">API Base URL (opcional)</label>
                <input
                  type="text"
                  value={newModelConfig.api_base}
                  onChange={(e) => setNewModelConfig({ ...newModelConfig, api_base: e.target.value })}
                  placeholder="https://api.openai.com/v1"
                  className="w-full p-2 bg-background border border-border rounded text-sm"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">API Key (opcional)</label>
                <input
                  type="password"
                  value={newModelConfig.api_key}
                  onChange={(e) => setNewModelConfig({ ...newModelConfig, api_key: e.target.value })}
                  placeholder="sk-..."
                  className="w-full p-2 bg-background border border-border rounded text-sm"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">System Prompt (opcional)</label>
                <textarea
                  value={newModelConfig.system_prompt || ''}
                  onChange={(e) => setNewModelConfig({ ...newModelConfig, system_prompt: e.target.value })}
                  placeholder="Você é um assistente útil..."
                  rows={3}
                  className="w-full p-2 bg-background border border-border rounded text-sm resize-none"
                />
              </div>

              <button
                onClick={handleSaveModel}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 flex items-center justify-center gap-2"
              >
                <Save size={16} />
                Salvar Modelo
              </button>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-border sticky bottom-0 bg-background">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
