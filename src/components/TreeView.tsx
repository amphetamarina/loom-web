import React, { useCallback, useMemo, useState, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useTreeStore } from '@/stores/treeStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { AIService } from '@/services/aiService';
import { EditableNode } from './EditableNode';
import { NodeDetailModal } from './NodeDetailModal';
import type { TreeNode } from '@/types';
import toast from 'react-hot-toast';

interface TreeViewProps {
  treeId: string;
}

const horizontalSpacing = 350; // Espaçamento entre níveis (esquerda-direita)
const verticalSpacing = 120;   // Espaçamento entre irmãos (cima-baixo)

const nodeTypes: NodeTypes = {
  editable: EditableNode,
};

export const TreeView: React.FC<TreeViewProps> = ({ treeId }) => {
  const { trees, setCurrentNode, updateNode, createNode, getAncestry, reparentNode } = useTreeStore();
  const { generationSettings, modelConfigs, preferences } = useSettingsStore();
  const tree = trees[treeId];
  const [generatingNodes, setGeneratingNodes] = useState<Set<string>>(new Set());
  const [streamingNodes, setStreamingNodes] = useState<Map<string, string>>(new Map());
  const [selectedNodeForDetail, setSelectedNodeForDetail] = useState<string | null>(null);
  const [reconnectingNodeId, setReconnectingNodeId] = useState<string | null>(null);

  const calculateLayout = useCallback(
    (rootId: string, nodes: Record<string, TreeNode>) => {
      const positions: Record<string, { x: number; y: number }> = {};
      const visited = new Set<string>();

      // Calcula a altura (vertical) da subárvore
      const calculateSubtreeHeight = (nodeId: string): number => {
        const node = nodes[nodeId];
        if (!node || visited.has(nodeId)) return 1;
        visited.add(nodeId);

        if (node.children.length === 0) return 1;

        return node.children.reduce((sum, childId) => {
          return sum + calculateSubtreeHeight(childId);
        }, 0);
      };

      // Layout horizontal: x aumenta para direita, y aumenta para baixo
      const layout = (nodeId: string, x: number, y: number, visited: Set<string>): number => {
        const node = nodes[nodeId];
        if (!node || visited.has(nodeId)) return y;
        visited.add(nodeId);

        positions[nodeId] = { x, y };

        let currentY = y;
        node.children.forEach((childId) => {
          const childHeight = calculateSubtreeHeight(childId);
          const childY = currentY + (childHeight * verticalSpacing) / 2 - verticalSpacing / 2;
          currentY = layout(childId, x + horizontalSpacing, childY, visited);
        });

        return Math.max(currentY, y + verticalSpacing);
      };

      visited.clear();
      layout(rootId, 0, 0, new Set());

      return positions;
    },
    []
  );

  const handleEditNode = useCallback(
    (nodeId: string, text: string) => {
      updateNode(treeId, nodeId, { text });
      toast.success('Texto atualizado');
    },
    [treeId, updateNode]
  );

  const handleGenerateFromNode = useCallback(
    async (nodeId: string) => {
      if (generatingNodes.has(nodeId)) {
        toast.error('Já está gerando para este nó');
        return;
      }

      setGeneratingNodes((prev) => new Set(prev).add(nodeId));

      try {
        // Build prompt from ancestry
        const ancestry = getAncestry(treeId, nodeId);
        const prompt = ancestry.map((node) => node.text).join('\n');

        if (!prompt.trim()) {
          toast.error('Adicione algum texto antes de gerar');
          setGeneratingNodes((prev) => {
            const next = new Set(prev);
            next.delete(nodeId);
            return next;
          });
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

        await aiService.generateStreaming(
          prompt,
          generationSettings,
          (completionIndex: number, text: string, done: boolean) => {
            if (!done) {
              // Update streaming state
              setStreamingNodes((prev) => {
                const next = new Map(prev);
                next.set(`${nodeId}-${completionIndex}`, text);
                return next;
              });
            } else {
              // Create final node
              createNode(treeId, text, nodeId);

              // Clear streaming state for this completion
              setStreamingNodes((prev) => {
                const next = new Map(prev);
                next.delete(`${nodeId}-${completionIndex}`);
                return next;
              });
            }
          }
        );

        toast.dismiss('generating');
        toast.success(`Continuações geradas!`);
      } catch (error) {
        console.error('Generation failed:', error);
        toast.error(error instanceof Error ? error.message : 'Falha na geração');
      } finally {
        setGeneratingNodes((prev) => {
          const next = new Set(prev);
          next.delete(nodeId);
          return next;
        });
      }
    },
    [
      treeId,
      generatingNodes,
      getAncestry,
      generationSettings,
      modelConfigs,
      createNode,
    ]
  );

  const handleNodeDetailClick = useCallback((nodeId: string) => {
    setSelectedNodeForDetail(nodeId);
  }, []);

  const handleAddChild = useCallback(
    (nodeId: string) => {
      // Create a new empty child node
      createNode(treeId, '(novo nó - clique duplo para editar)', nodeId);
      toast.success('Nó filho adicionado');
    },
    [treeId, createNode]
  );

  const handleReconnect = useCallback(
    (nodeId: string) => {
      // Start reconnecting mode
      setReconnectingNodeId(nodeId);
      toast.success('Clique em outro nó para reconectar');
    },
    []
  );

  const { nodes: flowNodes, edges: flowEdges } = useMemo(() => {
    if (!tree) return { nodes: [], edges: [] };

    const positions = calculateLayout(tree.rootId, tree.nodes);
    const allNodes: Node[] = [];

    // Add existing nodes
    Object.values(tree.nodes).forEach((node) => {
      allNodes.push({
        id: node.id,
        type: 'editable',
        position: positions[node.id] || { x: 0, y: 0 },
        data: {
          text: node.text,
          bookmark: node.bookmark,
          isSelected: node.id === tree.currentNodeId,
          truncateLength: preferences.node_text_truncate,
          onEdit: handleEditNode,
          onGenerate: handleGenerateFromNode,
          onDetailClick: handleNodeDetailClick,
          onAddChild: handleAddChild,
          onReconnect: node.parentId ? handleReconnect : undefined, // Only allow reconnecting nodes with parents
        },
      });
    });

    // Add streaming nodes as temporary children (layout horizontal)
    streamingNodes.forEach((text, key) => {
      const [parentId, completionIndex] = key.split('-');
      const parent = tree.nodes[parentId];
      if (parent && positions[parentId]) {
        const tempId = `temp-${key}`;
        const parentPos = positions[parentId];
        const childIndex = parseInt(completionIndex);

        allNodes.push({
          id: tempId,
          type: 'editable',
          position: {
            x: parentPos.x + horizontalSpacing,
            y: parentPos.y + (childIndex - 1.5) * verticalSpacing / 2,
          },
          data: {
            text: text,
            bookmark: false,
            isSelected: false,
            isStreaming: true,
            truncateLength: preferences.node_text_truncate,
            onEdit: () => {},
            onGenerate: () => {},
            onDetailClick: () => {},
            onAddChild: () => {},
          },
        });
      }
    });

    const edges: Edge[] = [];

    // Add edges for existing nodes
    Object.values(tree.nodes).forEach((node) => {
      node.children.forEach((childId) => {
        edges.push({
          id: `${node.id}-${childId}`,
          source: node.id,
          target: childId,
          type: 'smoothstep',
          animated: generatingNodes.has(node.id),
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#6b7280',
          },
          style: {
            stroke: generatingNodes.has(node.id) ? '#3b82f6' : '#6b7280',
            strokeWidth: generatingNodes.has(node.id) ? 2 : 1,
          },
        });
      });
    });

    // Add edges for streaming nodes
    streamingNodes.forEach((_, key) => {
      const [parentId] = key.split('-');
      const tempId = `temp-${key}`;
      edges.push({
        id: `${parentId}-${tempId}`,
        source: parentId,
        target: tempId,
        type: 'smoothstep',
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#3b82f6',
        },
        style: {
          stroke: '#3b82f6',
          strokeWidth: 2,
        },
      });
    });

    return { nodes: allNodes, edges };
  }, [tree, calculateLayout, handleEditNode, handleGenerateFromNode, handleNodeDetailClick, handleAddChild, handleReconnect, generatingNodes, streamingNodes, preferences.node_text_truncate]);

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);

  // Sync nodes and edges when flowNodes/flowEdges change
  useEffect(() => {
    setNodes(flowNodes);
  }, [flowNodes, setNodes]);

  useEffect(() => {
    setEdges(flowEdges);
  }, [flowEdges, setEdges]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.id.startsWith('temp-')) return;

      // If in reconnecting mode, set this node as the new parent
      if (reconnectingNodeId && reconnectingNodeId !== node.id) {
        reparentNode(treeId, reconnectingNodeId, node.id);
        toast.success('Nó reconectado! Gerar novas continuações?');
        setReconnectingNodeId(null);
        setCurrentNode(treeId, reconnectingNodeId);
      } else {
        setCurrentNode(treeId, node.id);
      }
    },
    [treeId, setCurrentNode, reconnectingNodeId, reparentNode]
  );

  if (!tree) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Nenhuma árvore carregada
      </div>
    );
  }

  return (
    <>
      <div className="w-full h-full bg-background">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          defaultViewport={{ x: 0, y: 0, zoom: 1.2 }}
          attributionPosition="bottom-left"
          minZoom={0.1}
          maxZoom={2}
        >
          <Background />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              if (node.id === tree.currentNodeId) return '#3b82f6';
              if (node.id.startsWith('temp-')) return '#10b981';
              return '#1f2937';
            }}
          />
        </ReactFlow>
      </div>

      {selectedNodeForDetail && (
        <NodeDetailModal
          treeId={treeId}
          nodeId={selectedNodeForDetail}
          onClose={() => setSelectedNodeForDetail(null)}
          onEdit={handleEditNode}
        />
      )}
    </>
  );
};
