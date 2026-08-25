import React, { useState, useEffect, useRef, useCallback } from "react";
import logoDoksli from "./img/logo/logo-doksli.png";
import {
  Doksli,
  FileEntry,
  Comment,
  fetchDokslis,
  fetchDoksli,
  createDoksli,
  incrementDoksliView,
  addDoksliComment,
  getFileViewUrl,
} from "./api/doksliApi";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseIsoDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  let normalized = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(normalized)) {
    normalized = normalized.replace(" ", "T") + "Z";
  } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(normalized)) {
    normalized = normalized + "Z";
  }
  return new Date(normalized);
}

function formatDateTime(dateStr: string) {
  try {
    const d = parseIsoDate(dateStr);
    const dateFormatted = new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(d);
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${dateFormatted}, ${hours}:${minutes}`;
  } catch {
    return dateStr;
  }
}

function timeAgo(dateStr: string) {
  try {
    const d = parseIsoDate(dateStr);
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff <= 10) return "baru saja";
    if (diff < 60) return `${diff} dtk lalu`;
    if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
    return `${Math.floor(diff / 86400)} hari lalu`;
  } catch {
    return dateStr;
  }
}

function countTotalComments(comments: Comment[] = []): number {
  let count = 0;
  for (const c of comments) {
    count += 1;
    if (c.replies && c.replies.length > 0) {
      count += countTotalComments(c.replies);
    }
  }
  return count;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(type: string) {
  if (!type) return "📎";
  if (type.startsWith("image/")) return "🖼️";
  if (type.startsWith("video/")) return "🎬";
  if (type.startsWith("audio/")) return "🎵";
  if (type.includes("pdf")) return "📄";
  if (type.includes("word") || type.includes("document")) return "📝";
  if (type.includes("sheet") || type.includes("excel")) return "📊";
  if (type.includes("zip") || type.includes("archive") || type.includes("compressed")) return "🗜️";
  return "📎";
}

function fileCategoryLabel(type: string) {
  if (!type) return "Dokumen";
  if (type.startsWith("image/")) return "Gambar";
  if (type.startsWith("video/")) return "Video";
  if (type.startsWith("audio/")) return "Audio";
  if (type.includes("pdf")) return "PDF";
  return "Dokumen";
}

function getShareUrl(doksliId: string) {
  if (typeof window === "undefined") return "";
  const url = new URL(window.location.href);
  url.searchParams.set("doksli", doksliId);
  return url.toString();
}

type Page = "home" | "create" | "detail";

const QUICK_EMOJIS = [
  "😀", "😂", "🔥", "❤️", "👍", "💩", "🤡", "🚀",
  "💡", "🥳", "💀", "🗿", "🙏", "😍", "🎉", "😎"
];

const PRESET_GIFS = [
  { name: "Cat Vibing", url: "https://media.giphy.com/media/jpbnoe3UIa8TU8LM13/giphy.gif" },
  { name: "Mind Blown", url: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif" },
  { name: "Popcorn", url: "https://media.giphy.com/media/hVTouUU06W9W0/giphy.gif" },
  { name: "GigaChad", url: "https://media.giphy.com/media/CAYVZA5NRb529kKQUc/giphy.gif" },
  { name: "Crying Laughing", url: "https://media.giphy.com/media/l3fQf1OEAq0iri9RC/giphy.gif" },
  { name: "Doge", url: "https://media.giphy.com/media/10ECeyOOj6nyJU/giphy.gif" },
  { name: "Pepe Hype", url: "https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif" },
  { name: "Dancing Parrot", url: "https://media.giphy.com/media/l41K3o5TzE71GFDEO/giphy.gif" },
];

// ─── Component: Header ────────────────────────────────────────────────────────

function Header({
  onHome,
  onCreate,
  darkMode,
  onToggleTheme,
}: {
  onHome: () => void;
  onCreate: () => void;
  darkMode: boolean;
  onToggleTheme: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-blue-100 dark:border-slate-800 shadow-xs transition-colors duration-200">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <button
          onClick={onHome}
          className="flex items-center gap-2.5 font-extrabold text-xl tracking-wide cursor-pointer hover:opacity-90 transition-opacity"
        >
          <img
            src={logoDoksli}
            alt="DOKSLI"
            className="w-9 h-9 rounded-full object-cover flex-shrink-0"
          />
          <span className="text-blue-500 dark:text-blue-400 font-extrabold text-xl tracking-wider" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            DOKSLI
          </span>
        </button>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onToggleTheme}
            type="button"
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
            aria-label={darkMode ? "Beralih ke mode terang" : "Beralih ke mode gelap"}
            title={darkMode ? "Mode Terang" : "Mode Gelap"}
          >
            {darkMode ? (
              <svg className="w-4.5 h-4.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-4.5 h-4.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          <button
            onClick={onCreate}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-medium text-xs rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            <span>+</span>
            <span>Buat Doksli</span>
          </button>
        </div>
      </div>
    </header>
  );
}

// ─── Component: HomePage ──────────────────────────────────────────────────────

function HomePage({
  doksliList,
  loading,
  error,
  onOpen,
  onCreate,
  onRetry,
  onShareDoksli,
}: {
  doksliList: Doksli[];
  loading: boolean;
  error: string | null;
  onOpen: (id: string) => void;
  onCreate: () => void;
  onRetry: () => void;
  onShareDoksli: (doksli: Doksli, e: React.MouseEvent) => void;
}) {
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = doksliList.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      (d.description && d.description.toLowerCase().includes(search.toLowerCase()))
  );

  const handleShareClick = (d: Doksli, e: React.MouseEvent) => {
    e.stopPropagation();
    onShareDoksli(d, e);
    setCopiedId(d.id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="text-center mb-8">
        <h1
          className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-slate-100 mb-2 transition-colors"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Berbagi Dokumen Asli
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto transition-colors">
          Upload file original secara anonim. Tanpa akun, tanpa batas waktu, dan bisa dibagikan via link ke siapapun.
        </p>
      </div>

      {/* Search bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Cari doksli..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-blue-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-500 focus:border-blue-400 dark:focus:border-blue-500 transition"
          />
          <span className="absolute left-3 top-2.5 text-slate-400 text-sm">
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 bg-white/50 dark:bg-slate-900/50 border border-blue-100 dark:border-slate-800 rounded-2xl p-8 transition-colors">
          <div className="inline-block animate-spin text-3xl mb-2">🔄</div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Menghubungkan ke server backend...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-2xl p-6 text-center text-red-600 dark:text-red-400 shadow-xs transition-colors">
          <p className="text-sm font-semibold mb-1">{error}</p>
          <p className="text-xs text-red-500 dark:text-red-400/80 mb-4">
            Pastikan backend berjalan dengan baik
          </p>
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-xl transition-colors cursor-pointer"
          >
            Coba Hubungkan Lagi
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-blue-100 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400 dark:text-slate-500 shadow-xs transition-colors">
          <p className="text-base font-medium text-slate-600 dark:text-slate-300 mb-1">Belum ada Doksli</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Mulai buat doksli baru dan bagikan file original kamu.</p>
          <button
            onClick={onCreate}
            className="px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white text-xs font-medium rounded-xl hover:bg-blue-600 dark:hover:bg-blue-500 transition-colors cursor-pointer"
          >
            Buat Doksli Pertama
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((d) => (
            <div
              key={d.id}
              onClick={() => onOpen(d.id)}
              className="group cursor-pointer bg-white dark:bg-slate-900 border border-blue-100 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-500/50 rounded-2xl p-5 hover:shadow-md dark:hover:shadow-slate-900/50 transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3
                    className="font-semibold text-slate-800 dark:text-slate-100 text-base group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {d.name}
                  </h3>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-xs px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 border border-transparent dark:border-blue-900/50 text-blue-600 dark:text-blue-400 font-medium rounded-full">
                      {d.files_count ?? d.files?.length ?? 0} file
                    </span>

                    <button
                      onClick={(e) => handleShareClick(d, e)}
                      type="button"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Bagikan link doksli ini"
                      aria-label="Bagikan link doksli"
                    >
                      {copiedId === d.id ? (
                        <span className="text-xs text-emerald-500 font-bold flex items-center gap-0.5">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {d.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                    {d.description}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-50 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
                <span>{formatDateTime(d.created_at)}</span>
                <div className="flex items-center gap-3">
                  <span>dilihat: {d.view_count}</span>
                  <span>komentar: {d.comments_count ?? countTotalComments(d.comments)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

// ─── Component: CreatePage ────────────────────────────────────────────────────

function CreatePage({
  onSubmit,
  onCancel,
}: {
  onSubmit: (name: string, description: string, files: File[]) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    setErrorMsg(null);
    try {
      await onSubmit(name.trim(), description.trim(), selectedFiles);
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal membuat Doksli.");
      setSubmitting(false);
    }
  };

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1
          className="text-xl font-bold text-slate-800 dark:text-slate-100 transition-colors"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Buat Doksli Baru
        </h1>
        <button
          onClick={onCancel}
          className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
        >
          Batal
        </button>
      </div>

      {errorMsg && (
        <div className="mb-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 rounded-xl p-3 text-xs">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 border border-blue-100 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5 transition-colors">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Nama Doksli <span className="text-blue-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="contoh: Foto Asli Meme Cat Vibing"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2 border border-blue-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-500 focus:border-blue-400 dark:focus:border-blue-500 transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Deskripsi (opsional)
          </label>
          <textarea
            rows={3}
            placeholder="Jelaskan asal usul atau detail file yang kamu upload..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3.5 py-2 border border-blue-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-500 focus:border-blue-400 dark:focus:border-blue-500 transition resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Upload File (/mnt/storage)
          </label>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-blue-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 bg-blue-50/50 dark:bg-slate-950/50 hover:bg-blue-50 dark:hover:bg-slate-950/80 rounded-xl p-6 text-center cursor-pointer transition-colors"
          >
            <div className="text-2xl mb-1">📁</div>
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Klik untuk memilih file</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              Gambar, Video, Audio, PDF, Dokumen, Zip (Maks 100MB)
            </p>
          </div>

          {selectedFiles.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {selectedFiles.map((file, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-blue-50/60 dark:bg-slate-800/80 border border-blue-100 dark:border-slate-700 rounded-lg px-3 py-2 text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span>{fileIcon(file.type)}</span>
                    <span className="font-medium text-slate-700 dark:text-slate-200 truncate">{file.name}</span>
                    <span className="text-slate-400 dark:text-slate-500">({formatSize(file.size)})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="text-slate-400 hover:text-red-500 text-sm ml-2 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="px-5 py-2 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:bg-blue-200 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-xs font-medium rounded-xl transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
          >
            {submitting ? (
              <>
                <span className="animate-spin">⏳</span>
                <span>Mengupload...</span>
              </>
            ) : (
              <span>Simpan Doksli</span>
            )}
          </button>
        </div>
      </form>
    </main>
  );
}

// ─── Component: CommentForm ───────────────────────────────────────────────────

function CommentForm({
  placeholder = "Tulis komentar (anonim)...",
  parentId = null,
  onSubmit,
  onCancel,
}: {
  placeholder?: string;
  parentId?: string | null;
  onSubmit: (
    text?: string,
    parentId?: string | null,
    imageFile?: File | null,
    imageUrl?: string | null
  ) => Promise<void>;
  onCancel?: () => void;
}) {
  const [text, setText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [customGifInput, setCustomGifInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setSelectedImageUrl(null);
      setFilePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveAttachment = () => {
    setSelectedFile(null);
    setSelectedImageUrl(null);
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
      setFilePreview(null);
    }
  };

  const handleInsertEmoji = (emoji: string) => {
    setText((prev) => prev + emoji);
  };

  const handleSelectGif = (url: string) => {
    setSelectedImageUrl(url);
    setSelectedFile(null);
    setFilePreview(null);
    setShowGifPicker(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !selectedFile && !selectedImageUrl) return;

    setSubmitting(true);
    try {
      await onSubmit(text.trim(), parentId, selectedFile, selectedImageUrl);
      setText("");
      handleRemoveAttachment();
      setShowEmojiPicker(false);
      setShowGifPicker(false);
      if (onCancel) onCancel();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 bg-white dark:bg-slate-900 border border-blue-100 dark:border-slate-800 p-4 rounded-xl shadow-xs transition-colors">
      <div className="relative">
        <textarea
          rows={2}
          placeholder={placeholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full px-3 py-2 border border-blue-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-500 transition resize-none"
        />
      </div>

      {/* Attachment Preview */}
      {(filePreview || selectedImageUrl) && (
        <div className="relative inline-block border border-blue-200 dark:border-slate-700 rounded-lg p-1 bg-slate-50 dark:bg-slate-950">
          <img
            src={filePreview || selectedImageUrl || ""}
            alt="Lampiran komentar"
            className="max-h-32 max-w-full rounded-md object-contain"
          />
          <button
            type="button"
            onClick={handleRemoveAttachment}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-md hover:bg-red-600 cursor-pointer"
            title="Hapus lampiran"
          >
            ✕
          </button>
        </div>
      )}

      {/* Toolbar & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Emoji toggle */}
          <button
            type="button"
            onClick={() => {
              setShowEmojiPicker(!showEmojiPicker);
              setShowGifPicker(false);
            }}
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-blue-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-100 dark:hover:bg-slate-700 transition flex items-center gap-1 cursor-pointer"
          >
            <span>😀</span>
            <span>Emoji</span>
          </button>

          {/* Image upload button */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-blue-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-100 dark:hover:bg-slate-700 transition flex items-center gap-1 cursor-pointer"
          >
            <span>📷</span>
            <span>Gambar/GIF</span>
          </button>

          {/* Preset GIF picker button */}
          <button
            type="button"
            onClick={() => {
              setShowGifPicker(!showGifPicker);
              setShowEmojiPicker(false);
            }}
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-blue-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-100 dark:hover:bg-slate-700 transition flex items-center gap-1 cursor-pointer"
          >
            <span>🎬</span>
            <span>GIF Presets</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition cursor-pointer"
            >
              Batal
            </button>
          )}
          <button
            type="submit"
            disabled={submitting || (!text.trim() && !selectedFile && !selectedImageUrl)}
            className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:bg-blue-200 dark:disabled:bg-slate-800 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition shadow-2xs cursor-pointer flex items-center gap-1.5"
          >
            {submitting ? "Mengirim..." : parentId ? "Kirim Balasan" : "Kirim Komentar"}
          </button>
        </div>
      </div>

      {/* Emoji Picker Bar */}
      {showEmojiPicker && (
        <div className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-blue-100 dark:border-slate-800 rounded-lg grid grid-cols-8 gap-1.5 text-lg animate-fade-in">
          {QUICK_EMOJIS.map((emoji, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleInsertEmoji(emoji)}
              className="hover:bg-white dark:hover:bg-slate-800 rounded p-1 text-center transition cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* GIF Picker Modal / Drawer */}
      {showGifPicker && (
        <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-blue-100 dark:border-slate-800 rounded-lg space-y-2.5 animate-fade-in">
          <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Pilih GIF Reaksi:</p>
          <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto pr-1">
            {PRESET_GIFS.map((gif, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectGif(gif.url)}
                className="group relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 hover:border-blue-500 transition cursor-pointer"
              >
                <img src={gif.url} alt={gif.name} className="w-full h-16 object-cover" />
                <span className="absolute bottom-0 left-0 right-0 bg-slate-900/70 text-[10px] text-white px-1 truncate text-center">
                  {gif.name}
                </span>
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 pt-1">
            <input
              type="url"
              placeholder="Atau tempel URL GIF/Gambar..."
              value={customGifInput}
              onChange={(e) => setCustomGifInput(e.target.value)}
              className="flex-1 px-2.5 py-1 border border-slate-300 dark:border-slate-700 rounded text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
            />
            <button
              type="button"
              onClick={() => {
                if (customGifInput.trim()) {
                  handleSelectGif(customGifInput.trim());
                  setCustomGifInput("");
                }
              }}
              className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded transition cursor-pointer"
            >
              Pilih
            </button>
          </div>
        </div>
      )}
    </form>
  );
}

// ─── Component: CommentItem ───────────────────────────────────────────────────

function CommentItem({
  comment,
  doksliId,
  onAddComment,
  onPreviewImage,
}: {
  comment: Comment;
  doksliId: string;
  onAddComment: (
    doksliId: string,
    text?: string,
    parentId?: string | null,
    imageFile?: File | null,
    imageUrl?: string | null
  ) => Promise<void>;
  onPreviewImage: (url: string) => void;
}) {
  const [showReplyForm, setShowReplyForm] = useState(false);

  return (
    <div className="bg-white dark:bg-slate-900 border border-blue-100 dark:border-slate-800 rounded-xl p-4 transition-colors shadow-2xs">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 font-semibold text-xs flex items-center justify-center">
            A
          </div>
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Anonim</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500">
          <span>{timeAgo(comment.posted_at)}</span>
          <span>·</span>
          <span>{formatDateTime(comment.posted_at)}</span>
        </div>
      </div>

      {comment.comment_text && (
        <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
          {comment.comment_text}
        </p>
      )}

      {comment.image_url && (
        <div className="mt-2">
          <img
            src={comment.image_url}
            alt="Lampiran Komentar"
            onClick={() => onPreviewImage(comment.image_url!)}
            className="max-w-xs max-h-60 rounded-xl object-cover border border-slate-200 dark:border-slate-800 cursor-pointer hover:opacity-90 transition shadow-2xs"
          />
        </div>
      )}

      <div className="mt-2.5 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setShowReplyForm(!showReplyForm)}
          className="flex items-center gap-1 text-xs font-medium text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
          <span>{showReplyForm ? "Batal Balas" : "Balas"}</span>
        </button>
      </div>

      {showReplyForm && (
        <div className="mt-3">
          <CommentForm
            placeholder="Tulis balasan..."
            parentId={comment.id}
            onSubmit={async (t, pId, f, url) => {
              await onAddComment(doksliId, t, pId, f, url);
              setShowReplyForm(false);
            }}
            onCancel={() => setShowReplyForm(false)}
          />
        </div>
      )}

      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="border-l-2 border-blue-200 dark:border-slate-800 pl-3 sm:pl-4 mt-3 space-y-3">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              doksliId={doksliId}
              onAddComment={onAddComment}
              onPreviewImage={onPreviewImage}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Component: DetailPage ────────────────────────────────────────────────────

function DetailPage({
  doksli,
  onBack,
  onAddComment,
  onShareDoksli,
}: {
  doksli: Doksli;
  onBack: () => void;
  onAddComment: (
    doksliId: string,
    text?: string,
    parentId?: string | null,
    imageFile?: File | null,
    imageUrl?: string | null
  ) => Promise<void>;
  onShareDoksli: (doksli: Doksli, e: React.MouseEvent) => void;
}) {
  const [previewFile, setPreviewFile] = useState<FileEntry | null>(null);
  const [previewCommentImage, setPreviewCommentImage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const totalComments = countTotalComments(doksli.comments);

  const handleShare = (e: React.MouseEvent) => {
    onShareDoksli(doksli, e);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      {/* Back & Share Bar */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
        >
          <span>←</span>
          <span>Kembali ke Beranda</span>
        </button>

        <button
          onClick={handleShare}
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-2xs cursor-pointer"
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Link Tersalin!</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              <span>Bagikan Link</span>
            </>
          )}
        </button>
      </div>

      {/* Header Info */}
      <div className="bg-white dark:bg-slate-900 border border-blue-100 dark:border-slate-800 rounded-2xl p-6 shadow-xs mb-6 transition-colors">
        <div className="flex items-start justify-between gap-4 mb-2">
          <h1
            className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 transition-colors"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {doksli.name}
          </h1>

          <button
            onClick={handleShare}
            className="flex-shrink-0 p-2 rounded-xl bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-slate-700 transition-all cursor-pointer"
            title="Salin tautan Doksli"
          >
            {copied ? (
              <span className="text-xs text-emerald-500 font-semibold px-1">Tersalin!</span>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            )}
          </button>
        </div>

        {doksli.description && (
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4 whitespace-pre-wrap">
            {doksli.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 dark:text-slate-500 pt-3 border-t border-slate-100 dark:border-slate-800">
          <span>Diupload {formatDateTime(doksli.created_at)}</span>
          <span>·</span>
          <span>👁️ {doksli.view_count} dilihat</span>
          <span>·</span>
          <span>{doksli.files?.length ?? 0} file</span>
        </div>
      </div>

      {/* Files */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          File ({doksli.files?.length ?? 0})
        </h2>

        {(!doksli.files || doksli.files.length === 0) ? (
          <div className="bg-white dark:bg-slate-900 border border-blue-100 dark:border-slate-800 rounded-xl p-8 text-center text-slate-400 dark:text-slate-500 transition-colors">
            <div className="text-3xl mb-2">📭</div>
            <p className="text-sm">Belum ada file di doksli ini.</p>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {doksli.files.map((f) => (
              <button
                key={f.id}
                onClick={() =>
                  f.mime_type.startsWith("image/")
                    ? setPreviewFile(f)
                    : window.open(getFileViewUrl(f.id), "_blank")
                }
                className="text-left flex items-center gap-3 bg-white dark:bg-slate-900 border border-blue-100 dark:border-slate-800 rounded-xl p-3 hover:border-blue-300 dark:hover:border-blue-500/50 hover:shadow-sm transition-all group cursor-pointer"
              >
                {f.mime_type.startsWith("image/") ? (
                  <img
                    src={getFileViewUrl(f.id)}
                    alt={f.original_name}
                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-blue-50 dark:bg-slate-800"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-slate-800 flex items-center justify-center text-2xl flex-shrink-0">
                    {fileIcon(f.mime_type)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {f.original_name}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {fileCategoryLabel(f.mime_type)} · {formatSize(f.file_size)}
                  </p>
                </div>
                <svg
                  className="flex-shrink-0 text-blue-200 dark:text-slate-600 group-hover:text-blue-400 dark:group-hover:text-blue-300 transition-colors"
                  width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Image preview modal for uploaded doksli file */}
      {previewFile && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewFile(null)}
        >
          <div className="relative max-w-3xl max-h-[85vh] w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={getFileViewUrl(previewFile.id)}
              alt={previewFile.original_name}
              className="w-full h-full object-contain rounded-xl"
            />
            <button
              onClick={() => setPreviewFile(null)}
              className="absolute top-3 right-3 w-8 h-8 bg-slate-900/80 dark:bg-slate-800/90 text-white rounded-full flex items-center justify-center hover:bg-slate-900 transition-colors cursor-pointer"
              aria-label="Tutup"
            >
              ✕
            </button>
            <div className="absolute bottom-3 left-3 bg-slate-900/90 dark:bg-slate-900/95 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-slate-700/50">
              <p className="text-xs font-medium text-slate-100">{previewFile.original_name}</p>
              <p className="text-xs text-slate-400">{formatSize(previewFile.file_size)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Image preview modal for comment attachment */}
      {previewCommentImage && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewCommentImage(null)}
        >
          <div className="relative max-w-3xl max-h-[85vh] w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={previewCommentImage}
              alt="Preview Komentar"
              className="w-full h-full object-contain rounded-xl"
            />
            <button
              onClick={() => setPreviewCommentImage(null)}
              className="absolute top-3 right-3 w-8 h-8 bg-slate-900/80 dark:bg-slate-800/90 text-white rounded-full flex items-center justify-center hover:bg-slate-900 transition-colors cursor-pointer"
              aria-label="Tutup"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Comments Section */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Komentar ({totalComments})
        </h2>

        {/* Primary Comment form */}
        <div className="mb-6">
          <CommentForm
            placeholder="Tulis komentar (anonim)..."
            onSubmit={(text, pId, img, url) => onAddComment(doksli.id, text, pId, img, url)}
          />
        </div>

        {/* Comment list */}
        {(!doksli.comments || doksli.comments.length === 0) ? (
          <div className="text-center py-8 text-slate-400 dark:text-slate-500 border border-dashed border-blue-100 dark:border-slate-800 rounded-xl transition-colors">
            <p className="text-sm">Belum ada komentar. Jadilah yang pertama!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {doksli.comments.map((c) => (
              <CommentItem
                key={c.id}
                comment={c}
                doksliId={doksli.id}
                onAddComment={onAddComment}
                onPreviewImage={(url) => setPreviewCommentImage(url)}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

// ─── Toast Notification Component ─────────────────────────────────────────────

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-slate-900/95 dark:bg-slate-800/95 text-white text-xs font-medium px-4 py-3 rounded-2xl shadow-xl border border-slate-700/60 backdrop-blur-md animate-fade-in">
      <span className="text-emerald-400 text-sm">✓</span>
      <span>{message}</span>
    </div>
  );
}

// ─── App Main ─────────────────────────────────────────────────────────────────

export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [doksliList, setDoksliList] = useState<Doksli[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDoksli, setActiveDoksli] = useState<Doksli | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("doksli-theme");
      if (saved) return saved === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
      localStorage.setItem("doksli-theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("doksli-theme", "light");
    }
  }, [darkMode]);

  const toggleTheme = () => {
    setDarkMode((prev) => !prev);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDokslis();
      setDoksliList(data);
    } catch (err: any) {
      setError("Tidak dapat terhubung ke Backend API.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleOpen = useCallback(async (id: string, updateUrl: boolean = true) => {
    try {
      if (updateUrl && typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("doksli", id);
        window.history.pushState({ doksliId: id }, "", url.toString());
      }
      const detail = await fetchDoksli(id);
      setActiveDoksli(detail);
      setPage("detail");
      const newViewCount = await incrementDoksliView(id);
      if (newViewCount > 0) {
        setActiveDoksli((prev) => (prev ? { ...prev, view_count: newViewCount } : null));
      }
    } catch (err) {
      alert("Gagal memuat detail Doksli.");
      setPage("home");
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete("doksli");
        window.history.pushState({}, "", url.pathname);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const sharedId = params.get("doksli") || params.get("id");
      if (sharedId) {
        handleOpen(sharedId, false);
      } else {
        loadData();
      }

      const handlePopState = () => {
        const currentParams = new URLSearchParams(window.location.search);
        const currentId = currentParams.get("doksli") || currentParams.get("id");
        if (currentId) {
          handleOpen(currentId, false);
        } else {
          setActiveDoksli(null);
          setPage("home");
          loadData();
        }
      };

      window.addEventListener("popstate", handlePopState);
      return () => window.removeEventListener("popstate", handlePopState);
    }
  }, [handleOpen, loadData]);

  const handleGoHome = () => {
    setActiveDoksli(null);
    setPage("home");
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("doksli");
      url.searchParams.delete("id");
      window.history.pushState({}, "", url.pathname || "/");
    }
    loadData();
  };

  const handleCreate = async (name: string, description: string, files: File[]) => {
    const newDoksli = await createDoksli(name, description, files);
    setActiveDoksli(newDoksli);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("doksli", newDoksli.id);
      window.history.pushState({ doksliId: newDoksli.id }, "", url.toString());
    }
    await loadData();
    setPage("detail");
    setToastMessage("Doksli berhasil dibuat! Link siap dibagikan.");
  };

  const handleAddComment = async (
    doksliId: string,
    text?: string,
    parentId?: string | null,
    imageFile?: File | null,
    imageUrl?: string | null
  ) => {
    await addDoksliComment(doksliId, text, parentId, imageFile, imageUrl);
    const updated = await fetchDoksli(doksliId);
    setActiveDoksli(updated);
    await loadData();
  };

  const handleShareDoksli = async (doksli: Doksli, e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = getShareUrl(doksli.id);

    if (navigator.share && /mobile|android|iphone|ipad/i.test(navigator.userAgent)) {
      try {
        await navigator.share({
          title: `Doksli: ${doksli.name}`,
          text: doksli.description || `Lihat dokumen "${doksli.name}" di DOKSLI`,
          url: shareUrl,
        });
        return;
      } catch {
        // Fallback
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setToastMessage("Tautan Doksli berhasil disalin ke clipboard!");
    } catch {
      prompt("Salin tautan ini:", shareUrl);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f7ff] dark:bg-[#0b0f17] text-slate-800 dark:text-slate-100 transition-colors duration-200">
      <Header
        onHome={handleGoHome}
        onCreate={() => setPage("create")}
        darkMode={darkMode}
        onToggleTheme={toggleTheme}
      />

      {page === "home" && (
        <HomePage
          doksliList={doksliList}
          loading={loading}
          error={error}
          onOpen={handleOpen}
          onCreate={() => setPage("create")}
          onRetry={loadData}
          onShareDoksli={handleShareDoksli}
        />
      )}

      {page === "create" && (
        <CreatePage
          onSubmit={handleCreate}
          onCancel={handleGoHome}
        />
      )}

      {page === "detail" && activeDoksli && (
        <DetailPage
          doksli={activeDoksli}
          onBack={handleGoHome}
          onAddComment={handleAddComment}
          onShareDoksli={handleShareDoksli}
        />
      )}

      {toastMessage && (
        <Toast
          message={toastMessage}
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}
