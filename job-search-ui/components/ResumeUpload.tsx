"use client";
import { useState, useRef } from "react";
import { ParsedResume } from "@/types";

interface ResumeUploadProps {
  onParsed: (profile: ParsedResume) => void;
}

export function ResumeUpload({ onParsed }: ResumeUploadProps) {
  const [state, setState] = useState<"idle" | "parsing" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file) return;

    const validTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!validTypes.includes(file.type)) {
      setError("Please upload a PDF or Word document.");
      setState("error");
      return;
    }

    setFileName(file.name);
    setState("parsing");
    setError("");

    try {
      const formData = new FormData();
      formData.append("resume", file);

      const res = await fetch("/api/parse-resume", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Parsing failed");
      }

      const data = await res.json();
      onParsed(data.profile);
      setState("done");
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
      setState("error");
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onClick={() => state === "idle" || state === "error" ? inputRef.current?.click() : null}
      className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
        state === "parsing"
          ? "border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800/50 cursor-wait"
          : state === "done"
          ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30"
          : state === "error"
          ? "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30"
          : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 bg-white dark:bg-zinc-900"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        onChange={handleChange}
        className="hidden"
      />

      {state === "idle" && (
        <div className="space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              Upload your CV
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              Drag and drop or click to browse
            </p>
            <p className="text-xs text-zinc-300 dark:text-zinc-600 mt-0.5">
              PDF or Word · max 10MB
            </p>
          </div>
        </div>
      )}

      {state === "parsing" && (
        <div className="space-y-3">
          <div className="w-12 h-12 rounded-full border-2 border-zinc-200 dark:border-zinc-700 border-t-zinc-900 dark:border-t-zinc-100 animate-spin mx-auto" />
          <div>
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              Reading your CV…
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              Gemini is extracting your skills and experience
            </p>
          </div>
        </div>
      )}

      {state === "done" && (
        <div className="space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              CV parsed successfully
            </p>
            <p className="text-xs text-zinc-400 mt-1">{fileName}</p>
            <button
              onClick={(e) => { e.stopPropagation(); setState("idle"); inputRef.current?.click(); }}
              className="text-xs text-zinc-400 underline underline-offset-2 mt-1 hover:text-zinc-600"
            >
              Upload a different CV
            </button>
          </div>
        </div>
      )}

      {state === "error" && (
        <div className="space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-red-600 dark:text-red-400">Upload failed</p>
            <p className="text-xs text-red-400 mt-1">{error}</p>
            <p className="text-xs text-zinc-400 mt-1">Click to try again</p>
          </div>
        </div>
      )}
    </div>
  );
}