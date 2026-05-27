# ADTranscribe

Aplicativo web de transcrição de áudio e vídeo usando a API Whisper da OpenAI. Suporta até 3 arquivos por vez com fila sequencial, formatação automática com IA e exportação em .txt.

## Como rodar localmente

### Pré-requisitos

Antes de começar, instale esses programas na sua máquina:

1. **Node.js 20+** ([baixar aqui](https://nodejs.org/)) — clique no botão grande verde "Download", execute o instalador e clique "Next" até o final
2. **Git** ([baixar aqui](https://git-scm.com/)) — idem, instale normalmente
3. **VS Code** ([baixar aqui](https://code.visualstudio.com/)) — recomendado, facilita muito
4. Uma **chave de API da OpenAI** ([criar aqui](https://platform.openai.com/api-keys)) — será usada depois

---

### Passo 1 — Abrir o VS Code

Abra o VS Code que você instalou.

### Passo 2 — Clonar o repositório

1. Clique em **`File`** → **`Clone Repository`** (ou use `Ctrl+Shift+P` e digite "clone")
2. Cole essa URL na caixa:
   ```
   https://github.com/hotmathdigital/trascritor-audio-e-video.git
   ```
3. Escolha uma pasta no seu PC para salvar o projeto (ex: Desktop, Documentos, etc.)
4. Clique em **`Select as Repository Destination`** e aguarde (pode levar alguns segundos)
5. Quando terminar, clique em **`Open`** para abrir a pasta no VS Code

### Passo 3 — Abrir o Terminal

Dentro do VS Code, clique em **`Terminal`** → **`New Terminal`** (ou use ``Ctrl+` ``)

Você verá um terminal preto abrir na parte de baixo da tela.

### Passo 4 — Instalar as dependências

No terminal, copie e cole esse comando:

```bash
npm install
```

Pressione **Enter** e aguarde terminar (pode levar 2-5 minutos na primeira vez). Você verá várias linhas aparecendo — isso é normal.

### Passo 5 — Criar o arquivo de configuração

1. No VS Code, à esquerda veja a lista de arquivos e pastas
2. Clique com botão direito no arquivo `.env.local.example`
3. Selecione **`Copy`**
4. Clique com botão direito na pasta vazia (raiz) → **`Paste`**
5. O arquivo copiado aparecerá como `env.local.example copy`
6. Clique com botão direito nele → **`Rename`** → mude o nome para `.env.local` (sem o "copy")
7. Abra esse arquivo `.env.local` (clique nele)
8. Substitua `sk-sua-chave-aqui` pela sua chave real da OpenAI

Exemplo:
```
OPENAI_API_KEY=sk-proj-abcd1234...seu-token-real-aqui...
```

**Salve** o arquivo (Ctrl+S).

### Passo 6 — Rodar a aplicação

No terminal do VS Code, digite:

```bash
npm run dev
```

Pressione **Enter**. Quando aparecer a mensagem com o link, abra seu navegador e acesse:

```
http://localhost:3000
```

**Pronto! O app está rodando!** 🎉

Para parar a aplicação depois, clique no terminal e pressione **Ctrl+C**.

## Custos

Os custos são pagos diretamente para a OpenAI usando a sua chave de API:

- **Whisper (transcrição)**: ~R$ 0,03 por minuto de áudio
- **GPT-4o-mini (diagramação)**: praticamente nada (~R$ 0,05 por hora de áudio)

Exemplo: 1 hora de áudio = aproximadamente R$ 1,85.

## Recursos suportados

- **Áudio**: MP3, M4A, AAC, WAV, OGG, OPUS, WMA
- **Vídeo**: MP4, MOV, MPEG, MPG, WMV
- **Tamanho máximo**: 500 MB por arquivo
- **Quantidade**: até 3 arquivos por vez
- **Idiomas**: Português, English, Español, Français, Deutsch, Italiano, 日本語, 中文, 한국어, Русский, العربية, हिन्दी

## Tecnologias

- Next.js 15 + React 19 + TypeScript
- Tailwind CSS v4
- OpenAI Whisper + GPT-4o-mini
- FFmpeg (via ffmpeg-static, sem instalação manual)

---

Desenvolvido por [@schaffer.ads](https://instagram.com/schaffer.ads)
