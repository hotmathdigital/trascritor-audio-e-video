import { NextRequest, NextResponse } from "next/server";
import { writeFile, unlink, readFile } from "fs/promises";
import { existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import OpenAI from "openai";

// Use the bundled ffmpeg binary — no system install required
ffmpeg.setFfmpegPath(ffmpegPath!);

export const runtime = "nodejs";
// 10-minute timeout for long files
export const maxDuration = 600;

const WHISPER_MAX_BYTES = 25 * 1024 * 1024; // 25 MB
const CLIENT_MAX_BYTES = 500 * 1024 * 1024; // 500 MB

const AUDIO_EXTENSIONS = new Set([".mp3", ".m4a", ".aac", ".wav", ".ogg", ".opus", ".wma"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".mpeg", ".mpg", ".wmv"]);

function ext(filename: string) {
  const idx = filename.lastIndexOf(".");
  return idx >= 0 ? filename.slice(idx).toLowerCase() : "";
}

async function extractAndCompressAudio(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .noVideo()
      .audioCodec("libmp3lame")
      .audioBitrate("32k")
      .audioChannels(1)
      .audioFrequency(16000)
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", (err: Error) => reject(err))
      .run();
  });
}

async function compressAudio(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioCodec("libmp3lame")
      .audioBitrate("32k")
      .audioChannels(1)
      .audioFrequency(16000)
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", (err: Error) => reject(err))
      .run();
  });
}

/** Minimum silence gap (seconds) between segments to trigger a new paragraph. */
const PARAGRAPH_GAP_S = 2.5;

interface Segment {
  start: number;
  end: number;
  text: string;
}

/**
 * Groups Whisper segments into paragraphs based on natural pauses.
 * A new paragraph is started whenever the gap between the end of one
 * segment and the start of the next exceeds PARAGRAPH_GAP_S seconds.
 */
function formatSegmentsIntoParagraphs(segments: Segment[]): string {
  if (segments.length === 0) return "";

  const paragraphs: string[] = [];
  let current = segments[0].text.trim();

  for (let i = 1; i < segments.length; i++) {
    const gap = segments[i].start - segments[i - 1].end;
    const chunk = segments[i].text.trim();
    if (!chunk) continue;

    if (gap >= PARAGRAPH_GAP_S) {
      paragraphs.push(current);
      current = chunk;
    } else {
      current += " " + chunk;
    }
  }

  if (current) paragraphs.push(current);

  return paragraphs.join("\n\n");
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY não configurada no servidor." }, { status: 500 });
  }
  const openai = new OpenAI({ apiKey });

  const inputPath: string[] = [];
  const outputPath: string[] = [];

  try {
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > CLIENT_MAX_BYTES) {
      return NextResponse.json({ error: "Arquivo muito grande. Limite: 500 MB." }, { status: 413 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const language = (formData.get("language") as string | null) ?? "pt";

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
    }

    const fileExt = ext(file.name);
    const isAudio = AUDIO_EXTENSIONS.has(fileExt);
    const isVideo = VIDEO_EXTENSIONS.has(fileExt);

    if (!isAudio && !isVideo) {
      return NextResponse.json({ error: `Formato não suportado: ${fileExt}` }, { status: 400 });
    }

    // Write uploaded file to /tmp
    const uid = randomUUID();
    const rawPath = join(tmpdir(), `${uid}-raw${fileExt}`);
    inputPath.push(rawPath);

    const bytes = await file.arrayBuffer();
    const rawBuffer = Buffer.from(bytes);
    const rawSize = rawBuffer.length;
    await writeFile(rawPath, rawBuffer);

    // Determine which file to send to Whisper
    let whisperPath = rawPath;

    if (isVideo) {
      // Always extract audio from video
      const audioPath = join(tmpdir(), `${uid}-audio.mp3`);
      outputPath.push(audioPath);
      await extractAndCompressAudio(rawPath, audioPath);
      whisperPath = audioPath;
    } else if (rawSize > WHISPER_MAX_BYTES) {
      // Audio file too large — compress it
      const compPath = join(tmpdir(), `${uid}-compressed.mp3`);
      outputPath.push(compPath);
      await compressAudio(rawPath, compPath);
      whisperPath = compPath;
    }

    // Read the final audio file
    const audioBuffer = await readFile(whisperPath);

    if (audioBuffer.length > WHISPER_MAX_BYTES) {
      return NextResponse.json(
        { error: "Arquivo de áudio ainda muito grande após compressão. Tente um arquivo mais curto." },
        { status: 413 }
      );
    }

    // Build a File object for the OpenAI SDK
    const audioFile = new File([audioBuffer], `audio.mp3`, { type: "audio/mpeg" });

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language,
      response_format: "verbose_json",
    });

    const text = formatSegmentsIntoParagraphs(transcription.segments ?? []);
    return NextResponse.json({ text });
  } catch (err: unknown) {
    console.error("[transcribe]", err);
    const message =
      err instanceof Error ? err.message : "Erro interno ao processar o arquivo.";

    // Surface useful Whisper errors
    if (message.includes("Invalid file format")) {
      return NextResponse.json({ error: "Formato de áudio não suportado pelo Whisper." }, { status: 422 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    // Always clean up temp files
    for (const p of [...inputPath, ...outputPath]) {
      if (existsSync(p)) {
        await unlink(p).catch(() => {});
      }
    }
  }
}
