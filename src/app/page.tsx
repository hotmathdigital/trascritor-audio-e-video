"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";

const ACCEPTED_TYPES: Record<string, string[]> = {
  "audio/mpeg": [".mp3"],
  "audio/mp4": [".m4a"],
  "audio/aac": [".aac"],
  "audio/wav": [".wav"],
  "audio/ogg": [".ogg"],
  "audio/opus": [".opus"],
  "audio/x-ms-wma": [".wma"],
  "video/mp4": [".mp4"],
  "video/quicktime": [".mov"],
  "video/mpeg": [".mpeg", ".mpg"],
  "video/x-ms-wmv": [".wmv"],
};

const LANGUAGES = [
  { code: "pt", label: "Português" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
  { code: "ja", label: "日本語" },
  { code: "zh", label: "中文" },
  { code: "ko", label: "한국어" },
  { code: "ru", label: "Русский" },
  { code: "ar", label: "العربية" },
  { code: "hi", label: "हिन्दी" },
];

const MAX_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB

type Stage = "idle" | "uploading" | "transcribing" | "done" | "error";

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [language, setLanguage] = useState("pt");
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const [formatting, setFormatting] = useState(false);
  const [formatError, setFormatError] = useState("");

  const onDrop = useCallback((accepted: File[], rejected: import("react-dropzone").FileRejection[]) => {
    if (rejected.length > 0) {
      const err = rejected[0].errors[0]?.message ?? "Arquivo inválido.";
      setErrorMsg(err);
      setStage("error");
      return;
    }
    if (accepted.length > 0) {
      setFile(accepted[0]);
      setStage("idle");
      setErrorMsg("");
      setTranscript("");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_SIZE_BYTES,
    maxFiles: 1,
  });

  async function handleTranscribe() {
    if (!file) return;
    setStage("uploading");
    setProgress(10);
    setErrorMsg("");
    setTranscript("");
    setFormatError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("language", language);

    try {
      setProgress(30);
      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      setStage("transcribing");
      setProgress(80);

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Erro desconhecido." }));
        throw new Error(body.error ?? `Erro HTTP ${res.status}`);
      }

      const data = await res.json();
      setProgress(100);
      setTranscript(data.text);
      setStage("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Falha ao transcrever. Tente novamente.");
      setStage("error");
    }
  }

  async function handleFormat() {
    if (!transcript || formatting) return;
    setFormatting(true);
    setFormatError("");

    try {
      const res = await fetch("/api/format", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: transcript }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Erro desconhecido." }));
        throw new Error(body.error ?? `Erro HTTP ${res.status}`);
      }

      const data = await res.json();
      setTranscript(data.text);
    } catch (err) {
      setFormatError(err instanceof Error ? err.message : "Falha ao diagramar.");
    } finally {
      setFormatting(false);
    }
  }

  async function handleCopy() {
    if (!transcript) return;
    await navigator.clipboard.writeText(transcript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    if (!transcript) return;
    const blob = new Blob([transcript], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const baseName = file ? file.name.replace(/\.[^.]+$/, "") : "transcricao";
    a.download = `${baseName}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleReset() {
    setFile(null);
    setStage("idle");
    setTranscript("");
    setErrorMsg("");
    setFormatError("");
    setProgress(0);
  }

  const isProcessing = stage === "uploading" || stage === "transcribing";

  return (
    <main className="min-h-screen flex flex-col items-center justify-start py-16 px-4">
      {/* Header */}
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white">ADTranscribe</h1>
        <p className="mt-2 text-gray-400 text-sm">
          Transcrição de áudio e vídeo — rápida, privada, sem histórico.
        </p>
      </div>

      <div className="w-full max-w-2xl space-y-5">
        {/* Drop zone */}
        <div
          {...getRootProps()}
          className={[
            "relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 cursor-pointer transition-colors",
            isDragActive
              ? "border-indigo-400 bg-indigo-950/30"
              : file
              ? "border-indigo-600 bg-gray-900"
              : "border-gray-700 bg-gray-900 hover:border-gray-500",
            isProcessing ? "pointer-events-none opacity-60" : "",
          ].join(" ")}
        >
          <input {...getInputProps()} />

          {file ? (
            <>
              <FileIcon className="w-10 h-10 text-indigo-400 mb-3" />
              <p className="font-medium text-white">{file.name}</p>
              <p className="text-sm text-gray-400 mt-1">{formatBytes(file.size)}</p>
              {!isProcessing && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleReset(); }}
                  className="mt-4 text-xs text-gray-500 hover:text-gray-300 underline"
                >
                  Remover arquivo
                </button>
              )}
            </>
          ) : (
            <>
              <UploadIcon className="w-10 h-10 text-gray-500 mb-3" />
              <p className="text-gray-300 font-medium">
                {isDragActive ? "Solte o arquivo aqui" : "Arraste um arquivo aqui"}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                ou clique para procurar
              </p>
              <p className="text-xs text-gray-600 mt-3">
                MP3 · M4A · AAC · WAV · OGG · MP4 · MOV · WMV · até 500 MB
              </p>
            </>
          )}
        </div>

        {/* Language selector + Transcribe button */}
        <div className="flex gap-3">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            disabled={isProcessing}
            className="flex-shrink-0 bg-gray-800 border border-gray-700 text-gray-100 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>

          <button
            onClick={handleTranscribe}
            disabled={!file || isProcessing}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-xl py-2.5 transition-colors"
          >
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2">
                <SpinnerIcon className="w-4 h-4 animate-spin" />
                {stage === "uploading" ? "Enviando…" : "Transcrevendo…"}
              </span>
            ) : (
              "Transcrever"
            )}
          </button>
        </div>

        {/* Progress bar */}
        {isProcessing && (
          <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-indigo-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Transcription error */}
        {stage === "error" && errorMsg && (
          <div className="rounded-xl bg-red-950/50 border border-red-800 px-4 py-3 text-sm text-red-300">
            {errorMsg}
          </div>
        )}

        {/* Transcript result */}
        {stage === "done" && transcript && (
          <div className="space-y-3">

            {/* Plain-text result — textarea garante cópia sem formatação */}
            <textarea
              readOnly
              value={transcript}
              rows={14}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-4 text-sm text-gray-100 leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans"
              style={{ whiteSpace: "pre-wrap" }}
            />

            {/* Format button */}
            <button
              onClick={handleFormat}
              disabled={formatting}
              className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-60 border border-gray-600 text-gray-200 text-sm font-medium rounded-xl py-2.5 transition-colors"
            >
              {formatting ? (
                <>
                  <SpinnerIcon className="w-4 h-4 animate-spin" />
                  Diagramando…
                </>
              ) : (
                <>
                  <SparklesIcon className="w-4 h-4 text-indigo-400" />
                  Diagramar com IA
                </>
              )}
            </button>

            {/* Format error */}
            {formatError && (
              <div className="rounded-xl bg-red-950/50 border border-red-800 px-4 py-3 text-sm text-red-300">
                {formatError}
              </div>
            )}

            {/* Copy / Download */}
            <div className="flex gap-3">
              <button
                onClick={handleCopy}
                className="flex-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 text-sm font-medium rounded-xl py-2.5 transition-colors"
              >
                {copied ? "Copiado!" : "Copiar texto"}
              </button>
              <button
                onClick={handleDownload}
                className="flex-1 bg-indigo-700 hover:bg-indigo-600 text-white text-sm font-medium rounded-xl py-2.5 transition-colors"
              >
                Baixar .txt
              </button>
            </div>

            <button
              onClick={handleReset}
              className="w-full text-xs text-gray-600 hover:text-gray-400 underline py-1"
            >
              Nova transcrição
            </button>
          </div>
        )}
      </div>

      <footer className="mt-16 text-xs text-gray-700 text-center">
        Nenhum arquivo é armazenado. Tudo é descartado após a transcrição.
      </footer>
    </main>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  );
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    </svg>
  );
}
