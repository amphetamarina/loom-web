# webloom

Tree-based writing interface for AI models — branch your prose, splice
continuations, edit subtrees freely. Originally a fork of
[socketteer/loom](https://github.com/socketteer/loom).

![screenshot](https://github.com/user-attachments/assets/05d9ffc9-43ca-475e-92de-34040a73a2f3)

## Features

- Tree-based writing with manual and AI-generated continuations
- Real-time token streaming
- Reparent, bookmark, delete subtrees, multiple tabs
- Local-only persistence — your trees never leave your browser
- Brutalist Windows NT look

## Any OpenAI-compatible endpoint works

Webloom speaks the OpenAI chat-completions and completions wire formats, so
any provider exposing those endpoints works. Just set the model's **Base URL**
and **API key** in Settings.

| Provider     | Base URL                          | API type     |
|--------------|-----------------------------------|--------------|
| OpenAI       | `https://api.openai.com/v1`       | chat         |
| Anthropic    | `https://api.anthropic.com/v1`    | chat         |
| Ollama       | `http://localhost:11434/v1`       | completions  |
| LM Studio    | `http://localhost:1234/v1`        | chat         |
| llama.cpp    | `http://localhost:8080/v1`        | completions  |
| vLLM / TGI   | `http://your-host:8000/v1`        | chat         |
| Groq         | `https://api.groq.com/openai/v1`  | chat         |
| Together     | `https://api.together.xyz/v1`     | chat         |
| OpenRouter   | `https://openrouter.ai/api/v1`    | chat         |

## Run it

```bash
mise install     # installs Bun via mise.toml
bun run dev      # http://localhost:3000
```

Don't have [mise](https://mise.jdx.dev)? Install [Bun](https://bun.sh)
directly and run `bun run dev`.

Set `PORT=...` to change the port.

## Use it

1. Open the app — a blank tree is created with one empty root node.
2. Click **Settings** in the title bar. Paste your API key(s) and pick a model.
3. **Edit** the root node, type a prompt, **Save**.
4. **Gen** streams a continuation as a child node.
5. Branch freely: edit any node, generate again, reparent, bookmark ★,
   delete subtrees ×.

Tabs across the top let you keep multiple trees. The status bar shows the
active model and temperature.

## Credits

- Original Loom: [socketteer/loom](https://github.com/socketteer/loom)
- Web fork: [@amphetamarina](https://github.com/amphetamarina)

See [DEVELOPMENT.md](./DEVELOPMENT.md) for architecture, internals, and
contributing notes.
