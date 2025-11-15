import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { Tree, TreeNode } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface TreeState {
  trees: Record<string, Tree>;
  activeTreeId: string | null;

  // Tree operations
  createTree: (name?: string) => string;
  loadTree: (tree: Tree) => void;
  deleteTree: (treeId: string) => void;
  setActiveTree: (treeId: string) => void;
  updateTreeName: (treeId: string, name: string) => void;

  // Node operations
  createNode: (treeId: string, text: string, parentId: string | null) => string;
  updateNode: (treeId: string, nodeId: string, updates: Partial<TreeNode>) => void;
  deleteNode: (treeId: string, nodeId: string) => void;
  setCurrentNode: (treeId: string, nodeId: string) => void;
  reparentNode: (treeId: string, nodeId: string, newParentId: string) => void;

  // Navigation
  getCurrentNode: (treeId: string) => TreeNode | null;
  getNode: (treeId: string, nodeId: string) => TreeNode | null;
  getChildren: (treeId: string, nodeId: string) => TreeNode[];
  getAncestry: (treeId: string, nodeId: string) => TreeNode[];

  // Utility
  exportTree: (treeId: string) => string;
  importTree: (jsonString: string) => string;
}

const createEmptyTree = (name: string = 'Untitled'): Tree => {
  const rootId = uuidv4();
  const now = Date.now();

  return {
    id: uuidv4(),
    name,
    rootId,
    nodes: {
      [rootId]: {
        id: rootId,
        text: '',
        parentId: null,
        children: [],
        created: now,
        modified: now,
      },
    },
    currentNodeId: rootId,
    created: now,
    modified: now,
  };
};

export const useTreeStore = create<TreeState>()(
  persist(
    immer((set, get) => ({
      trees: {},
      activeTreeId: null,

      createTree: (name = 'Untitled') => {
        const tree = createEmptyTree(name);
        set((state) => {
          state.trees[tree.id] = tree;
          state.activeTreeId = tree.id;
        });
        return tree.id;
      },

      loadTree: (tree: Tree) => {
        set((state) => {
          state.trees[tree.id] = tree;
          state.activeTreeId = tree.id;
        });
      },

      deleteTree: (treeId: string) => {
        set((state) => {
          delete state.trees[treeId];
          if (state.activeTreeId === treeId) {
            const remainingTrees = Object.keys(state.trees);
            state.activeTreeId = remainingTrees.length > 0 ? remainingTrees[0] : null;
          }
        });
      },

      setActiveTree: (treeId: string) => {
        set((state) => {
          state.activeTreeId = treeId;
        });
      },

      updateTreeName: (treeId: string, name: string) => {
        set((state) => {
          if (state.trees[treeId]) {
            state.trees[treeId].name = name;
            state.trees[treeId].modified = Date.now();
          }
        });
      },

      createNode: (treeId: string, text: string, parentId: string | null) => {
        const nodeId = uuidv4();
        const now = Date.now();

        set((state) => {
          const tree = state.trees[treeId];
          if (!tree) return;

          tree.nodes[nodeId] = {
            id: nodeId,
            text,
            parentId,
            children: [],
            created: now,
            modified: now,
          };

          if (parentId && tree.nodes[parentId]) {
            tree.nodes[parentId].children.push(nodeId);
          }

          tree.modified = now;
        });

        return nodeId;
      },

      updateNode: (treeId: string, nodeId: string, updates: Partial<TreeNode>) => {
        set((state) => {
          const tree = state.trees[treeId];
          if (!tree || !tree.nodes[nodeId]) return;

          Object.assign(tree.nodes[nodeId], updates);
          tree.nodes[nodeId].modified = Date.now();
          tree.modified = Date.now();
        });
      },

      deleteNode: (treeId: string, nodeId: string) => {
        set((state) => {
          const tree = state.trees[treeId];
          if (!tree || !tree.nodes[nodeId]) return;

          const node = tree.nodes[nodeId];

          // Remove from parent's children
          if (node.parentId && tree.nodes[node.parentId]) {
            tree.nodes[node.parentId].children = tree.nodes[node.parentId].children.filter(
              (id) => id !== nodeId
            );
          }

          // Recursively delete children
          const deleteRecursive = (id: string) => {
            const n = tree.nodes[id];
            if (!n) return;

            n.children.forEach(deleteRecursive);
            delete tree.nodes[id];
          };

          deleteRecursive(nodeId);
          tree.modified = Date.now();
        });
      },

      setCurrentNode: (treeId: string, nodeId: string) => {
        set((state) => {
          const tree = state.trees[treeId];
          if (tree && tree.nodes[nodeId]) {
            tree.currentNodeId = nodeId;
          }
        });
      },

      reparentNode: (treeId: string, nodeId: string, newParentId: string) => {
        set((state) => {
          const tree = state.trees[treeId];
          if (!tree || !tree.nodes[nodeId] || !tree.nodes[newParentId]) return;

          const node = tree.nodes[nodeId];

          // Can't reparent to itself or its own descendants
          if (nodeId === newParentId) return;

          // Remove from old parent's children
          if (node.parentId && tree.nodes[node.parentId]) {
            tree.nodes[node.parentId].children = tree.nodes[node.parentId].children.filter(
              (id) => id !== nodeId
            );
          }

          // Update node's parent
          node.parentId = newParentId;
          node.modified = Date.now();

          // Add to new parent's children
          if (!tree.nodes[newParentId].children.includes(nodeId)) {
            tree.nodes[newParentId].children.push(nodeId);
          }

          tree.modified = Date.now();
        });
      },

      getCurrentNode: (treeId: string) => {
        const { trees } = get();
        const tree = trees[treeId];
        if (!tree) return null;
        return tree.nodes[tree.currentNodeId] || null;
      },

      getNode: (treeId: string, nodeId: string) => {
        const { trees } = get();
        const tree = trees[treeId];
        return tree?.nodes[nodeId] || null;
      },

      getChildren: (treeId: string, nodeId: string) => {
        const { trees } = get();
        const tree = trees[treeId];
        if (!tree) return [];

        const node = tree.nodes[nodeId];
        if (!node) return [];

        return node.children.map((childId) => tree.nodes[childId]).filter(Boolean);
      },

      getAncestry: (treeId: string, nodeId: string) => {
        const { trees } = get();
        const tree = trees[treeId];
        if (!tree) return [];

        const ancestry: TreeNode[] = [];
        let currentId: string | null = nodeId;

        while (currentId && tree.nodes[currentId]) {
          ancestry.unshift(tree.nodes[currentId]);
          currentId = tree.nodes[currentId].parentId;
        }

        return ancestry;
      },

      exportTree: (treeId: string) => {
        const { trees } = get();
        const tree = trees[treeId];
        if (!tree) throw new Error('Tree not found');

        return JSON.stringify(tree, null, 2);
      },

      importTree: (jsonString: string) => {
        const tree = JSON.parse(jsonString) as Tree;
        set((state) => {
          state.trees[tree.id] = tree;
          state.activeTreeId = tree.id;
        });
        return tree.id;
      },
    })),
    {
      name: 'loom-trees',
      partialize: (state) => ({
        trees: state.trees,
        activeTreeId: state.activeTreeId,
      }),
    }
  )
);
