# 🚀 Início Rápido - Loom React

## ✅ Transformação Completa

O projeto Loom foi completamente transformado de Python/Tkinter para React moderno!

### O que mudou?

**Antes (Python/Tkinter):**
- Interface desktop com tkinter
- Python 3.9+
- API OpenAI antiga
- Configuração complexa

**Agora (React):**
- Interface web moderna
- React 18 + TypeScript
- API OpenAI mais recente (v4)
- Build rápido com Vite
- UI responsiva com Tailwind CSS
- Tema dark/light

## 📦 Instalação

### 1. Instalar dependências

```bash
npm install
```

Isso vai instalar:
- React 18.3
- TypeScript 5.6
- Vite 5.4
- Tailwind CSS 3.4
- Zustand (gerenciamento de estado)
- React Flow (visualização de árvore)
- OpenAI SDK 4.73
- E muito mais!

### 2. Configurar API Key

Copie o arquivo de exemplo:
```bash
cp .env.example .env
```

Edite `.env` e adicione sua chave da OpenAI:
```
VITE_OPENAI_API_KEY=sk-sua-chave-aqui
```

> **Nota:** Para uso em produção, mova a API key para um backend seguro.

### 3. Iniciar o servidor de desenvolvimento

```bash
npm run dev
```

O app vai abrir automaticamente em `http://localhost:3000`

## 🎯 Como Usar

### Criar sua primeira história

1. **Digite seu texto inicial** na área de leitura
2. **Clique no raio (⚡)** para gerar continuações com GPT
3. **Escolha um modelo:**
   - `gpt-4o` - Mais rápido e econômico
   - `gpt-4-turbo` - Melhor qualidade
   - `gpt-3.5-turbo` - Mais barato

4. **Configure os parâmetros:**
   - **Continuações:** Quantas alternativas gerar (1-10)
   - **Tokens:** Tamanho da continuação (10-4000)
   - **Temperature:** Criatividade (0=conservador, 2=criativo)
   - **Top P:** Diversidade de palavras (0-1)

5. **Clique em "Generate"** e aguarde!

### Navegar pela árvore

**Modo de Leitura:**
- Use as setas ← → para navegar entre pai/filho
- Clique no texto para ir para aquele nó
- Veja as opções de continuação no rodapé

**Modo de Árvore:**
- Clique no ícone de árvore no topo
- Navegue visualmente pela estrutura
- Arraste para mover
- Scroll para zoom
- Clique em nós para navegar

### Funcionalidades

**Edição:**
- Clique no ícone de lápis para editar
- Modifique o texto atual
- Salve ou cancele as mudanças

**Favoritos:**
- Clique na estrela ⭐ para marcar nós importantes
- Nós marcados aparecem destacados na árvore

**Múltiplas Abas:**
- Clique em + para criar nova árvore
- Trabalhe em múltiplas histórias ao mesmo tempo
- Feche abas clicando no X

**Salvar/Carregar:**
- 💾 **Save:** Exporta árvore como JSON
- 📂 **Open:** Importa árvore JSON
- Os dados são salvos automaticamente no navegador

**Tema:**
- Clique no ícone de sol/lua para alternar tema
- Dark mode por padrão

## 🔧 Comandos Disponíveis

```bash
# Desenvolvimento (hot reload)
npm run dev

# Build para produção
npm run build

# Preview da build
npm run preview

# Lint (verificar código)
npm run lint
```

## 📁 Estrutura do Projeto

```
loom/
├── src/
│   ├── components/          # Componentes React
│   │   ├── ReadView.tsx    # Interface de leitura
│   │   ├── TreeView.tsx    # Visualização de árvore
│   │   └── GenerateDialog.tsx
│   ├── stores/              # Estado (Zustand)
│   │   ├── treeStore.ts    # Estado das árvores
│   │   └── settingsStore.ts
│   ├── services/            # Serviços externos
│   │   └── openai.ts       # Integração OpenAI
│   ├── types/               # Tipos TypeScript
│   └── App.tsx              # App principal
├── public/                  # Assets estáticos
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## 🌐 Modelos Suportados

### OpenAI (Pré-configurados)
- **gpt-4o** - Recomendado! Rápido e eficiente
- **gpt-4o-mini** - Ainda mais rápido
- **gpt-4-turbo** - Máxima qualidade
- **gpt-3.5-turbo** - Econômico

### Adicionar Modelos Customizados

Você pode adicionar modelos de outros provedores (Together AI, llama.cpp local, etc.) através das configurações.

## 💡 Dicas

1. **Comece pequeno:** Use prompts curtos para resultados melhores
2. **Experimente temperature:** 0.7-1.0 para histórias criativas
3. **Use bookmarks:** Marque cenas importantes
4. **Salve frequentemente:** Exporte árvores importantes
5. **GPT-4o recomendado:** Melhor custo-benefício

## 🐛 Problemas Comuns

### "API key not found"
- Verifique se criou o arquivo `.env`
- Confirme que adicionou `VITE_OPENAI_API_KEY=sk-...`
- Reinicie o servidor de desenvolvimento

### "Module not found"
- Execute `npm install` novamente
- Delete `node_modules` e rode `npm install`

### Geração falha
- Verifique sua API key
- Confirme que tem créditos na OpenAI
- Tente reduzir o número de tokens

## 📚 Documentação Completa

Leia o `README-REACT.md` para documentação completa incluindo:
- Arquitetura detalhada
- Configurações avançadas
- Integração com APIs customizadas
- Notas de segurança
- Roadmap

## 🎉 Pronto!

Você agora tem uma interface moderna para escrever com GPT!

Divirta-se criando histórias incríveis! ✨
