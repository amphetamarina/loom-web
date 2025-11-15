# @amphetamarina/loom

A web-based fork of the [original loom](https://github.com/socketteer/loom) - a tree-based writing interface powered by AI.

<img width="1041" height="683" alt="image" src="https://github.com/user-attachments/assets/d538cf66-ee4f-4539-8907-8d1bd7475b60" />


## Features

- **Tree-Based Writing**: Explore multiple narrative branches visually
- **AI-Powered Generation**: Generate continuations using multiple AI providers
- **Multi-Provider Support**: OpenAI, Anthropic, Ollama, and custom endpoints
- **Real-Time Streaming**: See AI responses as they're generated
- **Interactive Tree Visualization**: Powered by React Flow with horizontal layout
- **Flexible Configuration**:
  - Chat API (default) for modern models
  - Completions API for Ollama and legacy models
  - Configurable system prompts per model
  - Temperature-only generation for maximum compatibility
- **Node Management**:
  - Manual node creation
  - Reconnect nodes to change narrative flow
  - Bookmark important nodes
  - Editable node titles
- **Persistence**: Auto-save with local storage
- **Modern UI**: Skeumorphic design with pastel yellow theme

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- API keys for your chosen provider (OpenAI, Anthropic, or Ollama)

### Installation

```bash
# Clone the repository
git clone https://github.com/amphetamarina/loom.git
cd loom

# Install dependencies
npm install

# Set up environment variables (optional)
cp .env.example .env
# Edit .env with your API keys

# Start development server
npm run dev
```

Visit `http://localhost:5173` to start using Loom.

### Building for Production

```bash
npm run build
npm run preview
```

## Configuration

### Adding AI Models

1. Open Settings (gear icon)
2. Click "Adicionar Novo Modelo"
3. Configure:
   - **Model Name**: e.g., `gpt-4o`, `claude-3-5-sonnet`, `llama3`
   - **Provider**: OpenAI, Anthropic, Ollama, or Custom
   - **API Type**:
     - `Chat / Messages API` for modern chat models (default)
     - `Completions API` for Ollama and legacy models
   - **Base URL**: (optional) Custom endpoint
   - **API Key**: (optional) Uses environment variable if not set
   - **System Prompt**: (optional) Custom system instructions

### Using with Ollama

For local inference with Ollama:

1. Install and start [Ollama](https://ollama.ai)
2. Pull a model: `ollama pull llama3`
3. In Loom Settings:
   - Provider: `Ollama`
   - API Type: `Completions API`
   - Model Name: `llama3`
   - Base URL: `http://localhost:11434/v1` (default)

## Usage

### Basic Workflow

1. **Start Writing**: Type your initial prompt in the root node
2. **Generate**: Click the lightning bolt icon to generate AI continuations
3. **Navigate**: Click on nodes to explore different branches
4. **Edit**: Double-click nodes to edit text
5. **Add Nodes**: Use the Plus icon to manually add child nodes
6. **Reconnect**: Use the Link icon to change a node's parent
7. **Save**: Trees are auto-saved to browser storage

### Keyboard Shortcuts

- **Double-click tab title**: Rename tree
- **Double-click node**: Edit text
- **Enter**: Save edits
- **Escape**: Cancel edits

## Technology Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite 5
- **State Management**: Zustand with persistence
- **AI SDK**: Vercel AI SDK
- **Visualization**: React Flow 11
- **Styling**: Tailwind CSS 3
- **Icons**: Lucide React

## Architecture

```
src/
├── components/       # React components
│   ├── TreeView.tsx     # Main tree visualization
│   ├── EditableNode.tsx # Interactive node component
│   ├── SettingsDialog.tsx
│   └── ...
├── services/         # Business logic
│   └── aiService.ts     # Multi-provider AI integration
├── stores/          # Zustand state management
│   ├── treeStore.ts     # Tree data and operations
│   └── settingsStore.ts # App settings and models
├── types/           # TypeScript definitions
└── hooks/           # Custom React hooks
```

## API Compatibility

### Chat API (Default)
Uses the Vercel AI SDK's unified `streamText()` interface:
- OpenAI: `gpt-4o`, `gpt-4o-mini`, etc.
- Anthropic: `claude-3-5-sonnet`, `claude-3-opus`, etc.
- Custom: Any OpenAI-compatible endpoint

### Completions API
Direct HTTP streaming for legacy compatibility:
- Ollama: All models
- Custom: Any `/v1/completions` compatible endpoint

## Development

### Project Structure

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Lint code
```

### Environment Variables

Create a `.env` file:

```env
VITE_OPENAI_API_KEY=sk-...
VITE_ANTHROPIC_API_KEY=sk-ant-...
```

## Contributing

This is a personal fork focused on web-based accessibility. For the original Python/Tkinter version, see [socketteer/loom](https://github.com/socketteer/loom).

## License

This project inherits the license from the original Loom project.

## Credits

- Original Loom: [socketteer/loom](https://github.com/socketteer/loom)
- Web fork: [@amphetamarina](https://github.com/amphetamarina)

## Troubleshooting

### Ollama Connection Issues
- Ensure Ollama is running: `ollama serve`
- Check base URL matches Ollama endpoint
- Select **Completions API** type (not Chat API)

### Model Compatibility
- Use Chat API for: OpenAI, Anthropic, most cloud providers
- Use Completions API for: Ollama, legacy models, custom endpoints

### Browser Storage
- Trees are saved to localStorage
- Export important work as JSON (coming soon)

---

**Happy writing! 🌳✨**
