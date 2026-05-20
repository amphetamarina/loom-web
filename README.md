# webloom

tree-based writing interface for AI models. branch your prose, splice continuations, edit subtrees freely. originally a fork of [socketteer/loom](https://github.com/socketteer/loom).

![screenshot](https://github.com/user-attachments/assets/05d9ffc9-43ca-475e-92de-34040a73a2f3)

## features

- tree-based writing with manual and AI-generated continuations
- real-time token streaming
- reparent, bookmark, delete subtrees, multiple tabs
- local-only persistence. your trees never leave your browser
- brutalist Windows NT look

## any OpenAI-compatible endpoint works

webloom speaks the OpenAI chat-completions and completions wire formats, so any provider exposing those endpoints works (OpenAI, Anthropic, Ollama, LM Studio, llama.cpp, vLLM, Groq, Together, OpenRouter, etc). just set the model's base URL and API key in settings.

## run it

```bash
mise install
bun run dev
```

then open http://localhost:3000.

no [mise](https://mise.jdx.dev)? install [Bun](https://bun.sh) directly and run `bun run dev`. set `PORT=...` to change the port.

## use it

1. open the app. a blank tree is created with one empty root node.
2. click settings in the title bar. paste your API key and pick a model.
3. edit the root node, type a prompt, save.
4. gen streams a continuation as a child node.
5. branch freely: edit any node, generate again, reparent, bookmark, delete subtrees.

tabs across the top let you keep multiple trees. the status bar shows the active model and temperature.

## credits

- original loom: [socketteer/loom](https://github.com/socketteer/loom)
- web fork: [@amphetamarina](https://github.com/amphetamarina)

see [DEVELOPMENT.md](./DEVELOPMENT.md) for architecture and internals.
