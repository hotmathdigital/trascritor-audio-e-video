# ADTranscribe

Aplicativo web de transcrição de áudio e vídeo usando a API Whisper da OpenAI. Suporta até 3 arquivos por vez com fila sequencial, formatação automática com IA e exportação em .txt.

## Como rodar localmente

### Pré-requisitos
- **Node.js 20+** instalado ([baixar aqui](https://nodejs.org/))
- **Git** instalado ([baixar aqui](https://git-scm.com/))
- Uma **chave de API da OpenAI** ([criar aqui](https://platform.openai.com/api-keys))

### Passo 1 — Clonar o repositório

Abra o terminal (Prompt de Comando, PowerShell ou Terminal) e rode:

```bash
git clone https://github.com/hotmathdigital/adtranscribe.git
cd adtranscribe
```

### Passo 2 — Instalar as dependências

```bash
npm install
```

Aguarde terminar (pode levar alguns minutos na primeira vez).

### Passo 3 — Configurar sua chave da OpenAI

Crie um arquivo chamado `.env.local` na raiz do projeto com o seguinte conteúdo:

```
OPENAI_API_KEY=sk-sua-chave-aqui
```

> **Importante:** substitua `sk-sua-chave-aqui` pela sua chave real da OpenAI. Você pode usar o arquivo `.env.local.example` como referência.

### Passo 4 — Rodar o app

```bash
npm run dev
```

Pronto! Acesse [http://localhost:3000](http://localhost:3000) no navegador.

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
