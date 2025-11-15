import React, { useState } from 'react';
import { useTreeStore } from '@/stores/treeStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { AIService } from '@/services/aiService';
import { X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface GenerateDialogProps {
  treeId: string;
  onClose: () => void;
}

export const GenerateDialog: React.FC<GenerateDialogProps> = ({ treeId, onClose }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const { trees, getCurrentNode, getAncestry, createNode, setCurrentNode } = useTreeStore();
  const { generationSettings, modelConfigs } = useSettingsStore();

  const tree = trees[treeId];
  const currentNode = getCurrentNode(treeId);

  const handleGenerate = async () => {
    if (!currentNode) return;

    setIsGenerating(true);
    try {
      // Build prompt from ancestry
      const ancestry = getAncestry(treeId, currentNode.id);
      const prompt = ancestry.map((node) => node.text).join('\n');

      if (!prompt.trim()) {
        toast.error('Adicione algum texto antes de gerar');
        setIsGenerating(false);
        return;
      }

      // Get model config
      const modelConfig = modelConfigs[generationSettings.model];
      if (!modelConfig) {
        throw new Error('Configuração do modelo não encontrada');
      }

      // Initialize AI service
      const aiService = new AIService(modelConfig);

      // Generate with streaming
      toast.loading(`Gerando ${generationSettings.num_continuations} continuações...`, {
        id: 'generating',
      });

      const completedTexts: string[] = [];

      await aiService.generateStreaming(
        prompt,
        generationSettings,
        (_completionIndex: number, text: string, done: boolean) => {
          if (done) {
            // Create final node
            createNode(treeId, text, currentNode.id);
            completedTexts.push(text);
          }
        }
      );

      // Navigate to first child
      if (completedTexts.length > 0) {
        const firstChildId = tree.nodes[currentNode.id].children[0];
        if (firstChildId) {
          setCurrentNode(treeId, firstChildId);
        }
      }

      toast.dismiss('generating');
      toast.success(`Continuações geradas!`);
      onClose();
    } catch (error) {
      console.error('Generation failed:', error);
      toast.dismiss('generating');
      toast.error(error instanceof Error ? error.message : 'Falha na geração');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!tree || !currentNode) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background border border-border rounded-lg w-full max-w-2xl max-h-[80vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-xl font-semibold">Generate Continuations</h2>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Model</label>
            <select
              value={generationSettings.model}
              onChange={(e) =>
                useSettingsStore.getState().updateGenerationSettings({ model: e.target.value })
              }
              className="w-full p-2 bg-background border border-border rounded"
            >
              {Object.keys(modelConfigs).map((modelName) => (
                <option key={modelName} value={modelName}>
                  {modelName}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Número de Continuações</label>
              <input
                type="number"
                min="1"
                max="10"
                value={generationSettings.num_continuations}
                onChange={(e) =>
                  useSettingsStore
                    .getState()
                    .updateGenerationSettings({ num_continuations: parseInt(e.target.value) })
                }
                className="w-full p-2 bg-background border border-border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Temperature</label>
              <input
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={generationSettings.temperature}
                onChange={(e) =>
                  useSettingsStore
                    .getState()
                    .updateGenerationSettings({ temperature: parseFloat(e.target.value) })
                }
                className="w-full p-2 bg-background border border-border rounded"
              />
            </div>
          </div>

          {/* Preview */}
          <div>
            <label className="block text-sm font-medium mb-2">Current story</label>
            <div className="p-4 bg-muted rounded max-h-48 overflow-auto text-sm">
              {getAncestry(treeId, currentNode.id)
                .map((node) => node.text)
                .join('\n')}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-border rounded hover:bg-accent"
            disabled={isGenerating}
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 flex items-center gap-2 disabled:opacity-50"
          >
            {isGenerating && <Loader2 size={16} className="animate-spin" />}
            {isGenerating ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </div>
    </div>
  );
};
