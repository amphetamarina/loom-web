# webloom

[![npm](https://img.shields.io/npm/v/@amphetamarina/webloom)](https://www.npmjs.com/package/@amphetamarina/webloom)
[![license](https://img.shields.io/npm/l/@amphetamarina/webloom)](./LICENSE)

tree-based writing interface for AI models. branch your prose, splice continuations, edit subtrees freely. originally a fork of [socketteer/loom](https://github.com/socketteer/loom).

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
bunx @amphetamarina/webloom
```

then open http://localhost:3000. set `PORT=...` to pick another port.

needs [Bun](https://bun.sh).

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
