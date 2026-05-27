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

const MAX_SIZE_BYTES = 500 * 1024 * 1024;
const MAX_FILES = 3;

type FileStatus = "pending" | "uploading" | "processing" | "transcribing" | "done" | "error";

const LARGE_FILE_THRESHOLD = 30 * 1024 * 1024; // 30 MB

interface FileEntry {
  file: File;
  status: FileStatus;
  transcript: string;
  error: string;
  copiedIndividual: boolean;
  formattingIndividual: boolean;
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Home() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [language, setLanguage] = useState("pt");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [errorMsg, setErrorMsg] = useState("");
  const [formattingAll, setFormattingAll] = useState(false);
  const [formatError, setFormatError] = useState("");

  const allDone = files.length > 0 && files.every((f) => f.status === "done" || f.status === "error");
  const hasTranscripts = files.some((f) => f.transcript);

  const onDrop = useCallback((accepted: File[], rejected: import("react-dropzone").FileRejection[]) => {
    if (rejected.length > 0) {
      const err = rejected[0].errors[0]?.message ?? "Arquivo inválido.";
      setErrorMsg(err);
      return;
    }
    setErrorMsg("");
    setFiles((prev) => {
      const remaining = MAX_FILES - prev.length;
      const toAdd = accepted.slice(0, remaining).map((file): FileEntry => ({
        file,
        status: "pending",
        transcript: "",
        error: "",
        copiedIndividual: false,
        formattingIndividual: false,
      }));
      return [...prev, ...toAdd];
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_SIZE_BYTES,
    maxFiles: MAX_FILES,
    disabled: isProcessing || files.length >= MAX_FILES,
  });

  function removeFile(index: number) {
    if (isProcessing) return;
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleTranscribe() {
    if (files.length === 0 || isProcessing) return;
    setIsProcessing(true);
    setFormatError("");

    for (let i = 0; i < files.length; i++) {
      if (files[i].status === "done") continue;

      setCurrentIndex(i);
      const isLarge = files[i].file.size > LARGE_FILE_THRESHOLD;
      setFiles((prev) => prev.map((f, idx) => idx === i ? { ...f, status: "uploading", error: "" } : f));

      // Para arquivos grandes: simulamos a transição entre estágios via timer
      // (não temos como saber server-side quando ffmpeg termina)
      const stageTimer1 = isLarge ? setTimeout(() => {
        setFiles((prev) => prev.map((f, idx) => idx === i && f.status === "uploading" ? { ...f, status: "processing" } : f));
      }, 3000) : null;
      const stageTimer2 = isLarge ? setTimeout(() => {
        setFiles((prev) => prev.map((f, idx) => idx === i && (f.status === "uploading" || f.status === "processing") ? { ...f, status: "transcribing" } : f));
      }, 15000) : setTimeout(() => {
        setFiles((prev) => prev.map((f, idx) => idx === i && f.status === "uploading" ? { ...f, status: "transcribing" } : f));
      }, 2000);

      try {
        const formData = new FormData();
        formData.append("file", files[i].file);
        formData.append("language", language);

        const res = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        });

        if (stageTimer1) clearTimeout(stageTimer1);
        clearTimeout(stageTimer2);

        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: "Erro desconhecido." }));
          throw new Error(body.error ?? `Erro HTTP ${res.status}`);
        }

        const data = await res.json();
        setFiles((prev) => prev.map((f, idx) => idx === i ? { ...f, status: "done", transcript: data.text } : f));
      } catch (err) {
        if (stageTimer1) clearTimeout(stageTimer1);
        clearTimeout(stageTimer2);
        const msg = err instanceof Error ? err.message : "Falha ao transcrever.";
        setFiles((prev) => prev.map((f, idx) => idx === i ? { ...f, status: "error", error: msg } : f));
      }
    }

    setCurrentIndex(-1);
    setIsProcessing(false);
  }

  async function handleFormatIndividual(index: number) {
    const entry = files[index];
    if (!entry?.transcript || entry.formattingIndividual) return;

    setFiles((prev) => prev.map((f, i) => i === index ? { ...f, formattingIndividual: true } : f));

    try {
      const res = await fetch("/api/format", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: entry.transcript }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Erro desconhecido." }));
        throw new Error(body.error ?? `Erro HTTP ${res.status}`);
      }

      const data = await res.json();
      setFiles((prev) => prev.map((f, i) => i === index ? { ...f, transcript: data.text, formattingIndividual: false } : f));
    } catch (err) {
      setFormatError(err instanceof Error ? err.message : "Falha ao diagramar.");
      setFiles((prev) => prev.map((f, i) => i === index ? { ...f, formattingIndividual: false } : f));
    }
  }

  async function handleFormatAll() {
    if (!hasTranscripts || formattingAll) return;
    setFormattingAll(true);
    setFormatError("");

    try {
      for (let i = 0; i < files.length; i++) {
        if (!files[i].transcript) continue;

        setFiles((prev) => prev.map((f, idx) => idx === i ? { ...f, formattingIndividual: true } : f));

        const res = await fetch("/api/format", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: files[i].transcript }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: "Erro desconhecido." }));
          throw new Error(body.error ?? `Erro HTTP ${res.status}`);
        }

        const data = await res.json();
        setFiles((prev) => prev.map((f, idx) => idx === i ? { ...f, transcript: data.text, formattingIndividual: false } : f));
      }
    } catch (err) {
      setFormatError(err instanceof Error ? err.message : "Falha ao diagramar.");
      setFiles((prev) => prev.map((f) => ({ ...f, formattingIndividual: false })));
    } finally {
      setFormattingAll(false);
    }
  }

  async function handleCopyIndividual(index: number) {
    const entry = files[index];
    if (!entry?.transcript) return;
    await navigator.clipboard.writeText(entry.transcript);
    setFiles((prev) => prev.map((f, i) => i === index ? { ...f, copiedIndividual: true } : f));
    setTimeout(() => {
      setFiles((prev) => prev.map((f, i) => i === index ? { ...f, copiedIndividual: false } : f));
    }, 2000);
  }

  function handleDownloadAll() {
    if (!hasTranscripts) return;
    const combined = files
      .filter((f) => f.transcript)
      .map((f) => `── ${f.file.name} ──\n\n${f.transcript}`)
      .join("\n\n\n");
    const blob = new Blob([combined], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transcricao.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleDownloadIndividual(index: number) {
    const entry = files[index];
    if (!entry?.transcript) return;
    const blob = new Blob([entry.transcript], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const baseName = entry.file.name.replace(/\.[^.]+$/, "");
    a.download = `${baseName}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleReset() {
    setFiles([]);
    setIsProcessing(false);
    setCurrentIndex(-1);
    setErrorMsg("");
    setFormatError("");
  }

  const anyFormatting = formattingAll || files.some((f) => f.formattingIndividual);

  return (
    <main className="min-h-screen flex flex-col items-center justify-start py-16 px-4">
      {/* Header */}
      <div className="mb-10 text-center flex flex-col items-center">
        <img src="/logoadtranscribe.png" alt="ADTranscribe" className="h-14 mb-3" />
        <p className="mt-2 text-gray-400 text-sm">
          Transcrição de áudio e vídeo — rápida, privada, sem histórico.
        </p>
      </div>

      <div className="w-full max-w-2xl space-y-5">
        {/* Drop zone */}
        {!allDone && (
          <div
            {...getRootProps()}
            className={[
              "relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 cursor-pointer transition-colors",
              isDragActive
                ? "border-indigo-400 bg-indigo-950/30"
                : files.length > 0
                ? "border-indigo-600 bg-gray-900"
                : "border-gray-700 bg-gray-900 hover:border-gray-500",
              isProcessing || files.length >= MAX_FILES ? "pointer-events-none opacity-60" : "",
            ].join(" ")}
          >
            <input {...getInputProps()} />

            {files.length === 0 ? (
              <>
                <UploadIcon className="w-10 h-10 text-gray-500 mb-3" />
                <p className="text-gray-300 font-medium">
                  {isDragActive ? "Solte os arquivos aqui" : "Arraste seus arquivos aqui"}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  ou clique para procurar (até {MAX_FILES} arquivos)
                </p>
                <p className="text-xs text-gray-600 mt-3">
                  MP3 · M4A · AAC · WAV · OGG · MP4 · MOV · WMV · até 500 MB cada
                </p>
              </>
            ) : (
              <>
                <UploadIcon className="w-8 h-8 text-gray-500 mb-2" />
                <p className="text-sm text-gray-400">
                  Adicionar mais arquivos ({files.length}/{MAX_FILES})
                </p>
              </>
            )}
          </div>
        )}

        {/* File list */}
        {files.length > 0 && !allDone && (
          <div className="space-y-2">
            {files.map((entry, i) => (
              <div key={i} className="flex items-center gap-3 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3">
                <FileIcon className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{entry.file.name}</p>
                  <p className="text-xs text-gray-500">
                    {formatBytes(entry.file.size)}
                    {entry.file.size > LARGE_FILE_THRESHOLD && (
                      <span className="ml-2 text-amber-400/80">• arquivo grande, pode levar alguns minutos</span>
                    )}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  {entry.status === "pending" && !isProcessing && (
                    <button onClick={() => removeFile(i)} className="text-xs text-gray-500 hover:text-red-400 transition-colors">
                      Remover
                    </button>
                  )}
                  {entry.status === "uploading" && (
                    <span className="flex items-center gap-1 text-xs text-indigo-400">
                      <SpinnerIcon className="w-3.5 h-3.5 animate-spin" /> Enviando…
                    </span>
                  )}
                  {entry.status === "processing" && (
                    <span className="flex items-center gap-1 text-xs text-indigo-400">
                      <SpinnerIcon className="w-3.5 h-3.5 animate-spin" /> Processando áudio…
                    </span>
                  )}
                  {entry.status === "transcribing" && (
                    <span className="flex items-center gap-1 text-xs text-indigo-400">
                      <SpinnerIcon className="w-3.5 h-3.5 animate-spin" /> Transcrevendo com IA…
                    </span>
                  )}
                  {entry.status === "done" && (
                    <span className="text-xs text-green-400">Concluído</span>
                  )}
                  {entry.status === "error" && (
                    <span className="text-xs text-red-400" title={entry.error}>Erro</span>
                  )}
                  {entry.status === "pending" && isProcessing && (
                    <span className="text-xs text-gray-500">Na fila</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Progress bar */}
        {isProcessing && (
          <div className="space-y-1">
            <p className="text-xs text-gray-400 text-center">
              Processando arquivo {currentIndex + 1} de {files.length}…
            </p>
            <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${((currentIndex + 1) / files.length) * 100}%` }}
              />
            </div>
            <p className="text-[11px] text-gray-500 text-center pt-1">
              Não feche essa aba. Arquivos grandes podem levar alguns minutos.
            </p>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="rounded-xl bg-red-950/50 border border-red-800 px-4 py-3 text-sm text-red-300">
            {errorMsg}
          </div>
        )}

        {/* Language selector + Transcribe button */}
        {files.length > 0 && !allDone && (
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
              disabled={files.length === 0 || isProcessing}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-xl py-2.5 transition-colors"
            >
              {isProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <SpinnerIcon className="w-4 h-4 animate-spin" />
                  Transcrevendo…
                </span>
              ) : (
                `Transcrever ${files.length === 1 ? "arquivo" : `${files.length} arquivos`}`
              )}
            </button>
          </div>
        )}

        {/* Results */}
        {allDone && hasTranscripts && (
          <div className="space-y-5">
            {/* Per-file results */}
            {files.filter((f) => f.transcript).map((entry, originalIndex) => {
              const i = files.indexOf(entry);
              return (
                <div key={i} className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden">
                  <div className="px-4 pt-3 pb-2 border-b border-gray-800 space-y-2">
                    <div className="flex items-center gap-2">
                      <FileIcon className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-300 truncate">{entry.file.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleCopyIndividual(i)}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-2.5 py-1.5 rounded-lg transition-colors"
                      >
                        {entry.copiedIndividual ? (
                          <>
                            <CheckIcon className="w-3.5 h-3.5 text-green-400" />
                            <span className="text-green-400">Copiado!</span>
                          </>
                        ) : (
                          <>
                            <CopyIcon className="w-3.5 h-3.5" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleFormatIndividual(i)}
                        disabled={entry.formattingIndividual || anyFormatting}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 disabled:opacity-50 px-2.5 py-1.5 rounded-lg transition-colors"
                      >
                        {entry.formattingIndividual ? (
                          <>
                            <SpinnerIcon className="w-3.5 h-3.5 animate-spin" />
                            <span>Diagramando…</span>
                          </>
                        ) : (
                          <>
                            <SparklesIcon className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Diagramar</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleDownloadIndividual(i)}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-2.5 py-1.5 rounded-lg transition-colors"
                      >
                        <DownloadIcon className="w-3.5 h-3.5" />
                        <span>Baixar .txt</span>
                      </button>
                    </div>
                  </div>
                  <textarea
                    readOnly
                    value={entry.transcript}
                    rows={8}
                    className="w-full bg-gray-900 px-4 py-4 text-sm text-gray-100 leading-relaxed resize-y focus:outline-none font-sans border-none outline-none"
                    style={{ whiteSpace: "pre-wrap" }}
                  />
                </div>
              );
            })}

            {/* Errors */}
            {files.filter((f) => f.status === "error").map((entry, i) => (
              <div key={`err-${i}`} className="rounded-xl bg-red-950/50 border border-red-800 px-4 py-3 text-sm text-red-300">
                <span className="font-medium">{entry.file.name}:</span> {entry.error}
              </div>
            ))}

            {/* Format all */}
            {files.filter((f) => f.transcript).length > 1 && (
              <>
                <button
                  onClick={handleFormatAll}
                  disabled={anyFormatting}
                  className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-60 border border-gray-600 text-gray-200 text-sm font-medium rounded-xl py-2.5 transition-colors"
                >
                  {formattingAll ? (
                    <>
                      <SpinnerIcon className="w-4 h-4 animate-spin" />
                      Diagramando todos…
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="w-4 h-4 text-indigo-400" />
                      Diagramar tudo com IA
                    </>
                  )}
                </button>
                <button
                  onClick={handleDownloadAll}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-700 hover:bg-indigo-600 text-white text-sm font-medium rounded-xl py-2.5 transition-colors"
                >
                  <DownloadIcon className="w-4 h-4" />
                  Baixar tudo em .txt
                </button>
              </>
            )}

            {formatError && (
              <div className="rounded-xl bg-red-950/50 border border-red-800 px-4 py-3 text-sm text-red-300">
                {formatError}
              </div>
            )}

            {/* Nova transcrição */}
            <button
              onClick={handleReset}
              className="w-full text-white text-sm font-semibold rounded-xl py-3 transition-all"
              style={{ background: "linear-gradient(135deg, #10b981, #059669, #34d399)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "linear-gradient(135deg, #34d399, #10b981, #059669)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "linear-gradient(135deg, #10b981, #059669, #34d399)"; }}
            >
              Nova transcrição
            </button>
          </div>
        )}

        {/* All failed */}
        {allDone && !hasTranscripts && (
          <div className="space-y-3">
            {files.map((entry, i) => (
              <div key={i} className="rounded-xl bg-red-950/50 border border-red-800 px-4 py-3 text-sm text-red-300">
                <span className="font-medium">{entry.file.name}:</span> {entry.error}
              </div>
            ))}
            <button
              onClick={handleReset}
              className="w-full text-white text-sm font-semibold rounded-xl py-3 transition-all"
              style={{ background: "linear-gradient(135deg, #10b981, #059669, #34d399)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "linear-gradient(135deg, #34d399, #10b981, #059669)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "linear-gradient(135deg, #10b981, #059669, #34d399)"; }}
            >
              Nova transcrição
            </button>
          </div>
        )}
      </div>

      <footer className="mt-16 text-xs text-gray-500 text-center space-y-1">
        <p>Nenhum arquivo é armazenado. Tudo é descartado após a transcrição.</p>
        <p>ADTranscribe — Desenvolvido por <a href="https://instagram.com/schaffer.ads" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 transition-colors">@schaffer.ads</a></p>
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

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m0 0a2.625 2.625 0 115.25 0H15" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}
