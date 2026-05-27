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

### Passo 1 — Criar uma pasta para o projeto

1. No seu PC, crie uma pasta em um lugar fácil de achar (ex: Desktop ou Documentos)
2. Nomeie como **`Transcritor`** (ou qualquer nome que quiser)

### Passo 2 — Abrir a pasta no VS Code

1. Abra o VS Code
2. Clique em **`File`** → **`Open Folder...`**
3. Procure a pasta **`Transcritor`** que você criou e clique em **`Select Folder`**

Agora você verá a pasta vazia aberta no VS Code.

### Passo 3 — Clonar o repositório pelo Terminal

1. Clique em **`Terminal`** → **`New Terminal`** (ou use ``Ctrl+` ``)
2. Você verá um terminal preto aparecer na parte de baixo
3. Cole esse comando:

```bash
git clone https://github.com/hotmathdigital/trascritor-audio-e-video.git .
```

Pressione **Enter** e aguarde terminar (pode levar alguns segundos). Os arquivos do projeto aparecerão na sua pasta.

### Passo 4 — Instalar as dependências

No terminal, copie e cole esse comando:

```bash
npm install
```

Pressione **Enter** e aguarde terminar (pode levar 2-5 minutos na primeira vez). Você verá várias linhas aparecendo — isso é normal.

### Passo 5 — Criar sua chave de API na OpenAI

1. Acesse [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Clique em **`+ Create new secret key`**
3. Dê um nome (ex: "TranscritorLocal") e clique em **`Create secret key`**
4. **Copie a chave que aparecer** (ela começa com `sk-proj-...`)
5. Guarde essa chave em algum lugar seguro (você precisará dela agora)

> **Aviso:** nunca compartilhe essa chave com ninguém! Ela permite que qualquer um use (e gaste) o seu crédito OpenAI.

### Passo 6 — Criar o arquivo de configuração

1. No VS Code, à esquerda veja a lista de arquivos e pastas
2. Clique com botão direito no arquivo `.env.local.example` → **`Rename`**
3. Mude o nome para `.env.local` e pressione **Enter**
4. Clique nesse arquivo para abrir
5. Substitua `sk-sua-chave-aqui` pela sua chave real (aquela que você copiou no Passo 5)

Exemplo:
```
OPENAI_API_KEY=sk-proj-abcd1234...sua-chave-real-aqui...
```

**Salve** o arquivo (Ctrl+S).

### Passo 7 — Rodar a aplicação

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
