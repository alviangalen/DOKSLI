import logoDoksli from "./img/logo/logo-doksli.png";
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
    return `${dateFormatted} • ${hours}:${minutes}`;
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
  if (type.startsWith("video/")) return "🎥";
  if (type.startsWith("audio/")) return "🎵";
  if (type.includes("pdf")) return "📄";
  if (type.includes("zip") || type.includes("rar") || type.includes("tar") || type.includes("compressed")) return "📦";
  if (type.includes("word") || type.includes("document")) return "📝";
  if (type.includes("sheet") || type.includes("excel") || type.includes("csv")) return "📊";
  return "📁";
}

function fileCategoryLabel(type: string) {
  if (!type) return "File";
  if (type.startsWith("image/")) return "Gambar";
  if (type.startsWith("video/")) return "Video";
  if (type.startsWith("audio/")) return "Audio";
  if (type.includes("pdf")) return "PDF";
  if (type.includes("zip") || type.includes("rar") || type.includes("tar")) return "Arsip";
  if (type.includes("word") || type.includes("document")) return "Dokumen";
  if (type.includes("sheet") || type.includes("excel") || type.includes("csv")) return "Spreadsheet";
  return "Berkas";
}

function getShareUrl(doksliId: string) {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/?doksli=${doksliId}`;
  }
  return `/?doksli=${doksliId}`;
}

type Page = "home" | "detail" | "create";

// ─── Emojis & Working GIF Presets ──────────────────────────────────────────

const QUICK_EMOJIS = ["😂", "🔥", "❤️", "👍", "👏", "😭", "🤯", "🗿", "💀", "🙏", "✨", "🎉", "👀", "😎", "🚀"];

const GIF_CATEGORIES = [
  { id: "all", label: "🔥 Semua" },
  { id: "lucu", label: "😂 Lucu" },
  { id: "reaksi", label: "🍿 Reaksi" },
  { id: "memes", label: "🗿 Memes" },
  { id: "love", label: "💖 Love" },
  { id: "joget", label: "💃 Joget" },
  { id: "syok", label: "😱 Syok" },
  { id: "flex", label: "💪 Flex" },
];

const PRESET_GIFS = [
  { id: "cat-vibing", name: "Cat Vibing", category: "joget", url: "https://i.giphy.com/jpbnoe3UIa8TU8LM13.gif", tags: ["cat", "joget", "dance", "vibing", "kucing", "musik"] },
  { id: "gigachad", name: "GigaChad", category: "flex", url: "https://i.giphy.com/CAYVZA5NRb529kKQUc.gif", tags: ["gigachad", "flex", "mewing", "chad", "ganteng", "sigma"] },
  { id: "popcorn", name: "Popcorn", category: "reaksi", url: "https://i.giphy.com/hVTouUU06W9W0.gif", tags: ["popcorn", "nonton", "nyimak", "reaksi", "drama"] },
  { id: "mind-blown", name: "Mind Blown", category: "syok", url: "https://i.giphy.com/26ufdipQqU2lhNA4g.gif", tags: ["mindblown", "syok", "kaget", "explosion", "wow"] },
  { id: "crying-laughing", name: "Ngakak", category: "lucu", url: "https://i.giphy.com/l3fQf1OEAq0iri9RC.gif", tags: ["ngakak", "lucu", "ketawa", "lol", "wkwk"] },
  { id: "doge", name: "Doge", category: "memes", url: "https://i.giphy.com/10ECeyOOj6nyJU.gif", tags: ["doge", "anjing", "dog", "meme", "wow"] },
  { id: "pepe-hype", name: "Pepe Hype", category: "memes", url: "https://i.giphy.com/3oKIPnAiaMCws8nOsE.gif", tags: ["pepe", "hype", "party", "joget", "frog"] },
  { id: "dancing-parrot", name: "Dancing Parrot", category: "joget", url: "https://i.giphy.com/l41K3o5TzE71GFDEO.gif", tags: ["parrot", "burung", "joget", "dance", "party"] },
  { id: "shocked-pikachu", name: "Shocked Pikachu", category: "syok", url: "https://i.giphy.com/6nWhy3njWyc0GPea97.gif", tags: ["pikachu", "pokemon", "syok", "kaget", "meme"] },
  { id: "confused-travolta", name: "Confused", category: "reaksi", url: "https://i.giphy.com/g01ZnwAUvutuK8GIQn.gif", tags: ["confused", "bingung", "travolta", "pulp fiction", "mana"] },
  { id: "facepalm", name: "Facepalm", category: "reaksi", url: "https://i.giphy.com/xsF1FSDbjguis.gif", tags: ["facepalm", "tepok jidat", "pasrah", "capek", "stres"] },
  { id: "side-eye-cat", name: "Side Eye Cat", category: "reaksi", url: "https://i.giphy.com/CaiVJuGVvR8Pe.gif", tags: ["cat", "side eye", "curiga", "sinis", "kucing"] },
  { id: "deal-with-it", name: "Deal With It", category: "flex", url: "https://i.giphy.com/xT0XzCJadP6iTndDYA.gif", tags: ["deal with it", "kacamata", "cool", "flex", "mantap"] },
  { id: "laughing-leo", name: "Laughing Leo", category: "lucu", url: "https://i.giphy.com/O5Xp9qtdp4m9a.gif", tags: ["leo", "dicaprio", "ketawa", "cheers", "lucu"] },
  { id: "everything-fine", name: "Fine Dog", category: "reaksi", url: "https://i.giphy.com/9M5jK4GXmD5o1irGrF.gif", tags: ["fine", "fire", "kebakaran", "anjing", "pasrah"] },
  { id: "cat-heart", name: "Cat Heart Eyes", category: "love", url: "https://i.giphy.com/MDJ9IbxxvDUQM.gif", tags: ["love", "cat", "kucing", "cinta", "uwu", "cute"] },
  { id: "sad-cat", name: "Sad Cat", category: "sedih", url: "https://i.giphy.com/L95W4wv8nnb9K.gif", tags: ["sad", "sedih", "nangis", "cat", "kucing"] },
  { id: "emotional-damage", name: "Emotional Damage", category: "lucu", url: "https://i.giphy.com/ro08zs5GLJKlq.gif", tags: ["emotional damage", "sakit", "lucu", "steven he"] },
  { id: "party-cat", name: "Party Hard", category: "joget", url: "https://i.giphy.com/artj92V8o75VPL7AeQ.gif", tags: ["party", "pesta", "cheering", "asik", "joget"] },
  { id: "homer-bush", name: "Homer Hiding", category: "reaksi", url: "https://i.giphy.com/COYGe9rZvfiaQ.gif", tags: ["homer", "simpsons", "kabur", "sembunyi", "malu"] },
  { id: "think-about-it", name: "Roll Safe", category: "memes", url: "https://i.giphy.com/d3mlE7uhX8KFgEmY.gif", tags: ["pikir", "think", "smart", "otak", "meme"] },
  { id: "spongebob-imagination", name: "Imagination", category: "memes", url: "https://i.giphy.com/SKGo6OUPg5yCI.gif", tags: ["spongebob", "pelangi", "rainbow", "imagination"] },
  { id: "cat-typing", name: "Cat Typing Fast", category: "lucu", url: "https://i.giphy.com/JIX9t2j0ZTN9S.gif", tags: ["cat", "typing", "ngetik", "kucing", "sibuk"] },
  { id: "mic-drop", name: "Mic Drop", category: "flex", url: "https://i.giphy.com/3o7qDSOvfaCO9b3MlO.gif", tags: ["mic drop", "flex", "selesai", "kelar", "obama"] },
  { id: "disappointed-fan", name: "Disappointed", category: "sedih", url: "https://i.giphy.com/LSk5aGh2WYL6g.gif", tags: ["disappointed", "kecewa", "sedih", "bapak", "cricket"] }
];

// ─── Component: MediaLightboxModal ───────────────────────────────────────────

function MediaLightboxModal({
  title,
  subtitle,
  url,
  mimeType,
  onClose,
}: {
  title: string;
  subtitle?: string;
  url: string;
  mimeType?: string;
  onClose: () => void;
}) {
  const isImage = !mimeType || mimeType.startsWith("image/");
  const isVideo = mimeType?.startsWith("video/");
  const isAudio = mimeType?.startsWith("audio/");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 transition-opacity animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative max-w-5xl w-full max-h-[94vh] flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/95 flex-shrink-0">
          <div className="min-w-0 flex-1 pr-3">
            <p className="text-sm font-semibold text-slate-100 truncate">{title}</p>
            {subtitle && <p className="text-xs text-slate-400 truncate">{subtitle}</p>}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-950/60 border border-blue-800/60 rounded-lg hover:bg-blue-900/60 transition flex items-center gap-1.5 cursor-pointer"
              title="Buka original di tab baru"
            >
              <span>↗</span>
              <span className="hidden sm:inline">Tab Baru</span>
            </a>
            <a
              href={url}
              download={title}
              className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
              title="Unduh file"
            >
              <span>⬇</span>
              <span className="hidden sm:inline">Unduh</span>
            </a>
            <button
              onClick={onClose}
              className="w-7 h-7 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg flex items-center justify-center transition cursor-pointer"
              aria-label="Tutup"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Media Container with full scroll support for tall images */}
        <div className="flex-1 overflow-y-auto overflow-x-auto p-4 flex items-center justify-center bg-slate-950/80 min-h-[300px] max-h-[82vh]">
          {isImage ? (
            <img
              src={url}
              alt={title}
              className="max-h-[78vh] w-auto max-w-full object-contain rounded-lg select-none shadow-md"
            />
          ) : isVideo ? (
            <video
              src={url}
              controls
              autoPlay
              className="max-h-[78vh] max-w-full rounded-lg shadow-md"
            />
          ) : isAudio ? (
            <div className="py-12 flex flex-col items-center">
              <div className="text-5xl mb-4">🎵</div>
              <audio src={url} controls className="w-full max-w-md" />
            </div>
          ) : (
            <div className="py-12 text-center text-slate-300">
              <div className="text-5xl mb-3">📄</div>
              <p className="text-sm font-medium mb-3">Pratinjau dokumen / file non-gambar</p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-xl transition inline-flex items-center gap-2"
              >
                Buka File di Tab Baru ↗
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-blue-100 dark:border-slate-800 transition-colors">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <button
          onClick={onHome}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <img
            src={logoDoksli}
            alt="Doksli Logo"
            className="w-7 h-7 rounded-lg object-contain shadow-2xs group-hover:scale-105 transition-transform"
          />
          <span
            className="font-bold text-base tracking-tight text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            DOKSLI
          </span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-blue-50/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
            aria-label="Ganti Tema"
            title={darkMode ? "Ganti ke Tema Terang" : "Ganti ke Tema Gelap"}
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

  const handleShareClick = (doksli: Doksli, e: React.MouseEvent) => {
    onShareDoksli(doksli, e);
    setCopiedId(doksli.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="text-center py-6 sm:py-8 mb-6">
        <h1
          className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100 mb-2 transition-colors"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Berbagi Dokumen Asli
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto transition-colors">
          Upload file original secara anonim. Tanpa akun, tanpa batas waktu, dan bisa dibagikan via link ke siapapun.
        </p>

        {/* Search */}
        <div className="mt-5 max-w-lg mx-auto relative">
          <input
            type="text"
            placeholder="Cari doksli..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-blue-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-500 focus:border-blue-400 dark:focus:border-blue-500 shadow-2xs transition"
          />
          <span className="absolute left-3 top-2.5 text-slate-400 text-xs sm:text-sm">
            🔍
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
                        <span className="text-xs font-semibold text-emerald-500">✓</span>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {d.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">
                    {d.description}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 pt-3 border-t border-slate-100 dark:border-slate-800/80 mt-2">
                <span>{formatDateTime(d.created_at)}</span>
                <div className="flex items-center gap-3">
                  <span>👁️ {d.view_count}</span>
                  <span>💬 {d.comments_count ?? countTotalComments(d.comments)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

// ─── Component: CreatePage (with Drag & Drop + Rich Previews) ─────────────────

type SelectedFileWithPreview = {
  file: File;
  previewUrl: string | null;
  id: string;
};

function CreatePage({
  onSubmit,
  onCancel,
}: {
  onSubmit: (name: string, description: string, files: File[]) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFileList, setSelectedFileList] = useState<SelectedFileWithPreview[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [modalPreviewFile, setModalPreviewFile] = useState<SelectedFileWithPreview | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add files to preview list
  const addFiles = useCallback((files: File[]) => {
    if (!files.length) return;
    const newItems: SelectedFileWithPreview[] = files.map((file) => ({
      file,
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`,
    }));
    setSelectedFileList((prev) => [...prev, ...newItems]);
  }, []);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      selectedFileList.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeFile = (id: string) => {
    setSelectedFileList((prev) => {
      const item = prev.find((x) => x.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((x) => x.id !== id);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const totalSize = useMemo(() => {
    return selectedFileList.reduce((acc, curr) => acc + curr.file.size, 0);
  }, [selectedFileList]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const rawFiles = selectedFileList.map((x) => x.file);
      await onSubmit(name.trim(), description.trim(), rawFiles);
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
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Upload File & Gambar
            </label>
            {selectedFileList.length > 0 && (
              <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                {selectedFileList.length} file dipilih ({formatSize(totalSize)})
              </span>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
              isDragging
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 scale-[1.01]"
                : "border-blue-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 bg-blue-50/40 dark:bg-slate-950/50 hover:bg-blue-50 dark:hover:bg-slate-950/80"
            }`}
          >
            <div className="text-3xl mb-1.5">📁</div>
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
              {isDragging ? "Lepaskan file di sini!" : "Klik atau seret file ke sini"}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              Mendukung Gambar (PNG, JPG, GIF, WebP), Video, Audio, PDF, Dokumen (Maks 100MB/file)
            </p>
          </div>

          {/* Visual Previews Grid */}
          {selectedFileList.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Pratinjau File yang Akan Diupload ({selectedFileList.length}):
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-80 overflow-y-auto pr-1">
                {selectedFileList.map((item) => (
                  <div
                    key={item.id}
                    className="relative group bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 flex items-center gap-3 shadow-2xs hover:border-blue-300 dark:hover:border-blue-500 transition-all"
                  >
                    {/* Thumbnail Image or Icon */}
                    {item.previewUrl ? (
                      <div
                        onClick={() => setModalPreviewFile(item)}
                        className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100 dark:bg-slate-900 cursor-pointer group/thumb border border-slate-200 dark:border-slate-700"
                        title="Klik untuk pratinjau penuh"
                      >
                        <img
                          src={item.previewUrl}
                          alt={item.file.name}
                          className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-white text-xs">
                          🔍
                        </div>
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-slate-900 border border-blue-100 dark:border-slate-700 flex items-center justify-center text-2xl flex-shrink-0">
                        {fileIcon(item.file.type)}
                      </div>
                    )}

                    {/* Meta info */}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate" title={item.file.name}>
                        {item.file.name}
                      </p>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-400 mt-0.5">
                        <span className="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-700/60 rounded text-[10px] font-medium text-slate-600 dark:text-slate-300">
                          {fileCategoryLabel(item.file.type)}
                        </span>
                        <span>•</span>
                        <span>{formatSize(item.file.size)}</span>
                      </div>
                    </div>

                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => removeFile(item.id)}
                      className="w-7 h-7 flex-shrink-0 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 flex items-center justify-center transition cursor-pointer"
                      title="Hapus file ini"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {/* Add more button */}
              <div className="pt-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>+ Tambah file lainnya</span>
                </button>
              </div>
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
                <span>Mengupload Doksli...</span>
              </>
            ) : (
              <span>Simpan Doksli</span>
            )}
          </button>
        </div>
      </form>

      {/* Modal Preview for Single Selected File in Upload Form */}
      {modalPreviewFile && modalPreviewFile.previewUrl && (
        <MediaLightboxModal
          title={modalPreviewFile.file.name}
          subtitle={`Pratinjau sebelum upload • ${formatSize(modalPreviewFile.file.size)}`}
          url={modalPreviewFile.previewUrl}
          mimeType={modalPreviewFile.file.type}
          onClose={() => setModalPreviewFile(null)}
        />
      )}
    </main>
  );
}

// ─── Component: CommentForm (with working GIF & Image support) ─────────────────

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
  const [gifSearchTerm, setGifSearchTerm] = useState("");
  const [gifActiveCategory, setGifActiveCategory] = useState("all");
  const [customGifInput, setCustomGifInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setSelectedImageUrl(null);
      setFilePreview(URL.createObjectURL(file));
      setShowGifPicker(false);
    }
  };

  const handleRemoveAttachment = () => {
    setSelectedFile(null);
    setSelectedImageUrl(null);
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
      setFilePreview(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleInsertEmoji = (emoji: string) => {
    setText((prev) => prev + emoji);
  };

  const handleSelectGif = (url: string) => {
    setSelectedImageUrl(url);
    setSelectedFile(null);
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
      setFilePreview(null);
    }
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
    } catch (err: any) {
      alert(err.message || "Gagal mengirim komentar.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="relative border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/90 shadow-2xs focus-within:border-blue-400 dark:focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-950/60 transition-all">
        <textarea
          rows={parentId ? 2 : 3}
          placeholder={placeholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full px-4 pt-3 pb-2 bg-transparent text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none resize-none"
        />

        {/* Attachment preview banner */}
        {(selectedFile || selectedImageUrl) && (
          <div className="px-4 pb-2 flex items-center gap-2">
            <div className="relative inline-block rounded-xl overflow-hidden border border-blue-200 dark:border-slate-700 bg-blue-50 dark:bg-slate-800 p-1">
              <img
                src={filePreview || selectedImageUrl || ""}
                alt="Lampiran komentar"
                className="w-14 h-14 object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={handleRemoveAttachment}
                className="absolute -top-1 -right-1 w-5 h-5 bg-slate-900/90 text-white text-[10px] font-bold rounded-full flex items-center justify-center hover:bg-red-600 transition shadow-xs cursor-pointer"
                title="Hapus lampiran"
              >
                ✕
              </button>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              <p className="font-semibold text-blue-600 dark:text-blue-400">
                {selectedFile ? "File terlampir:" : "GIF terpilih:"}
              </p>
              <p className="truncate max-w-[200px]">
                {selectedFile ? selectedFile.name : selectedImageUrl}
              </p>
            </div>
          </div>
        )}

        {/* Action bar inside comment box */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/30 rounded-b-2xl">
          <div className="flex items-center gap-1">
            {/* Hidden image file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Upload image button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs"
              title="Upload Foto/GIF lokal"
            >
              <span>🖼️</span>
              <span className="hidden sm:inline text-[11px]">Upload</span>
            </button>

            {/* Preset GIF picker button */}
            <button
              type="button"
              onClick={() => {
                setShowGifPicker((prev) => !prev);
                setShowEmojiPicker(false);
              }}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs font-medium ${
                showGifPicker
                  ? "bg-blue-500 text-white dark:bg-blue-600"
                  : "text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800"
              }`}
              title="Pilih GIF Populer"
            >
              <span>🎬</span>
              <span className="text-[11px]">GIF</span>
            </button>

            {/* Emoji picker toggle */}
            <button
              type="button"
              onClick={() => {
                setShowEmojiPicker((prev) => !prev);
                setShowGifPicker(false);
              }}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer text-xs ${
                showEmojiPicker
                  ? "bg-amber-100 dark:bg-amber-950/60 text-amber-600"
                  : "text-slate-500 dark:text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-slate-800"
              }`}
              title="Pilih Emoji"
            >
              <span>😀</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
              >
                Batal
              </button>
            )}

            <button
              type="submit"
              disabled={submitting || (!text.trim() && !selectedFile && !selectedImageUrl)}
              className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:bg-blue-200 dark:disabled:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              {submitting ? (
                <>
                  <span className="animate-spin text-xs">⏳</span>
                  <span>Kirim...</span>
                </>
              ) : (
                <span>Kirim</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Emoji Picker Drawer */}
      {showEmojiPicker && (
        <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-md flex flex-wrap gap-1.5 animate-fade-in">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleInsertEmoji(emoji)}
              className="w-8 h-8 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-800 flex items-center justify-center text-lg hover:scale-110 transition cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* GIF Picker Drawer */}
      {showGifPicker && (
        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl space-y-3 animate-fade-in">
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Cari GIF (kucing, joget, ketawa, flex, syok...)"
              value={gifSearchTerm}
              onChange={(e) => setGifSearchTerm(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <span className="absolute left-2.5 top-2 text-xs text-slate-400">🔍</span>
            {gifSearchTerm && (
              <button
                type="button"
                onClick={() => setGifSearchTerm("")}
                className="absolute right-2.5 top-1.5 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
            {GIF_CATEGORIES.map((cat) => {
              const isActive = gifActiveCategory === cat.id && !gifSearchTerm;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setGifActiveCategory(cat.id);
                    setGifSearchTerm("");
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition cursor-pointer ${
                    isActive
                      ? "bg-blue-500 text-white dark:bg-blue-600"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* GIF Grid */}
          {(() => {
            const filteredGifs = PRESET_GIFS.filter((gif) => {
              const matchesCategory =
                gifActiveCategory === "all" || gif.category === gifActiveCategory;
              const q = gifSearchTerm.trim().toLowerCase();
              const matchesSearch =
                !q ||
                gif.name.toLowerCase().includes(q) ||
                gif.tags.some((t) => t.toLowerCase().includes(q));
              return matchesCategory && matchesSearch;
            });

            if (filteredGifs.length === 0) {
              return (
                <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                  Tidak ada GIF yang cocok dengan "{gifSearchTerm}"
                </div>
              );
            }

            return (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-56 overflow-y-auto pr-1">
                {filteredGifs.map((gif) => (
                  <button
                    key={gif.id}
                    type="button"
                    onClick={() => handleSelectGif(gif.url)}
                    className="group relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-200 hover:scale-[1.03] cursor-pointer shadow-2xs aspect-video bg-slate-200 dark:bg-slate-900"
                  >
                    <img
                      src={gif.url}
                      alt={gif.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 via-slate-950/40 to-transparent text-[10px] font-medium text-white px-1.5 py-1 truncate text-center opacity-90 group-hover:opacity-100 transition-opacity">
                      {gif.name}
                    </span>
                  </button>
                ))}
              </div>
            );
          })()}

          {/* Custom URL Input */}
          <div className="flex gap-1.5 pt-1 border-t border-slate-200/60 dark:border-slate-800/80">
            <input
              type="url"
              placeholder="Atau tempel URL GIF/Gambar eksternal..."
              value={customGifInput}
              onChange={(e) => setCustomGifInput(e.target.value)}
              className="flex-1 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => {
                if (customGifInput.trim()) {
                  handleSelectGif(customGifInput.trim());
                  setCustomGifInput("");
                }
              }}
              className="px-3.5 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-xl transition cursor-pointer"
            >
              Pakai
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
  onPreviewImage: (url: string, title?: string) => void;
}) {
  const [showReplyForm, setShowReplyForm] = useState(false);

  return (
    <div className="bg-white dark:bg-slate-900 border border-blue-100 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-2 transition-colors">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 text-white text-[10px] font-bold flex items-center justify-center">
            A
          </span>
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            Anonim
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 text-[11px]">
          <span>{timeAgo(comment.posted_at)}</span>
          <span>•</span>
          <span>{formatDateTime(comment.posted_at)}</span>
        </div>
      </div>

      {comment.comment_text && (
        <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
          {comment.comment_text}
        </p>
      )}

      {comment.image_url && (
        <div className="pt-1">
          <img
            src={comment.image_url}
            alt="Lampiran Komentar"
            onClick={() => onPreviewImage(comment.image_url!, "Gambar Komentar")}
            className="max-h-60 max-w-full sm:max-w-xs rounded-xl border border-slate-200 dark:border-slate-800 object-cover cursor-pointer hover:opacity-95 hover:scale-[1.01] transition shadow-xs"
            loading="lazy"
          />
        </div>
      )}

      {/* Reply toggle button */}
      <div className="pt-1 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setShowReplyForm((prev) => !prev)}
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition cursor-pointer flex items-center gap-1"
        >
          <span>💬</span>
          <span>{showReplyForm ? "Tutup Balasan" : "Balas"}</span>
        </button>
      </div>

      {/* Nested Reply form */}
      {showReplyForm && (
        <div className="pt-2 pl-3 border-l-2 border-blue-200 dark:border-blue-900/60">
          <CommentForm
            placeholder="Tulis balasan untuk komentar ini..."
            parentId={comment.id}
            onSubmit={async (text, pId, img, url) => {
              await onAddComment(doksliId, text, pId, img, url);
              setShowReplyForm(false);
            }}
            onCancel={() => setShowReplyForm(false)}
          />
        </div>
      )}

      {/* Recursive nested replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="pt-2 pl-3 sm:pl-4 border-l-2 border-slate-100 dark:border-slate-800 space-y-2 mt-2">
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
  const [lightboxData, setLightboxData] = useState<{
    title: string;
    subtitle?: string;
    url: string;
    mimeType?: string;
  } | null>(null);

  const [copied, setCopied] = useState(false);

  const handleShareClick = (e: React.MouseEvent) => {
    onShareDoksli(doksli, e);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalComments = countTotalComments(doksli.comments);

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      {/* Back button */}
      <button
        onClick={onBack}
        className="mb-4 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5 cursor-pointer"
      >
        <span>←</span>
        <span>Kembali ke Beranda</span>
      </button>

      {/* Doksli Main Card */}
      <div className="bg-white dark:bg-slate-900 border border-blue-100 dark:border-slate-800 rounded-2xl p-6 shadow-xs mb-6 transition-colors">
        <div className="flex items-start justify-between gap-4 mb-3">
          <h1
            className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 leading-tight"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {doksli.name}
          </h1>

          <button
            onClick={handleShareClick}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            {copied ? (
              <span className="text-emerald-500 font-bold">✓ Tersalin</span>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <span>Bagikan Link</span>
              </>
            )}
          </button>
        </div>

        {doksli.description && (
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4 whitespace-pre-wrap">
            {doksli.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 dark:text-slate-500 pt-3 border-t border-slate-100 dark:border-slate-800">
          <span>Diupload {formatDateTime(doksli.created_at)}</span>
          <span>•</span>
          <span>👁️ {doksli.view_count} dilihat</span>
          <span>•</span>
          <span>📁 {doksli.files?.length ?? 0} file</span>
        </div>
      </div>

      {/* Files Section */}
      <section className="mb-8">
        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          File Dokumen ({doksli.files?.length ?? 0})
        </h2>

        {(!doksli.files || doksli.files.length === 0) ? (
          <div className="bg-white dark:bg-slate-900 border border-blue-100 dark:border-slate-800 rounded-xl p-8 text-center text-slate-400 dark:text-slate-500 transition-colors">
            <div className="text-3xl mb-2">📭</div>
            <p className="text-sm">Belum ada file di doksli ini.</p>
          </div>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {doksli.files.map((f) => {
              const viewUrl = getFileViewUrl(f.id);
              return (
                <div
                  key={f.id}
                  onClick={() =>
                    setLightboxData({
                      title: f.original_name,
                      subtitle: `${fileCategoryLabel(f.mime_type)} • ${formatSize(f.file_size)}`,
                      url: viewUrl,
                      mimeType: f.mime_type,
                    })
                  }
                  className="text-left flex items-center gap-3 bg-white dark:bg-slate-900 border border-blue-100 dark:border-slate-800 rounded-xl p-3 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all group cursor-pointer"
                >
                  {f.mime_type.startsWith("image/") ? (
                    <img
                      src={viewUrl}
                      alt={f.original_name}
                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-blue-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-slate-800 flex items-center justify-center text-2xl flex-shrink-0 border border-blue-100 dark:border-slate-700">
                      {fileIcon(f.mime_type)}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {f.original_name}
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                      {fileCategoryLabel(f.mime_type)} • {formatSize(f.file_size)}
                    </p>
                  </div>

                  <span className="text-xs text-blue-500 font-medium group-hover:translate-x-0.5 transition-transform flex-shrink-0">
                    Lihat ↗
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Lightbox Modal (Fixed complete full-height view) */}
      {lightboxData && (
        <MediaLightboxModal
          title={lightboxData.title}
          subtitle={lightboxData.subtitle}
          url={lightboxData.url}
          mimeType={lightboxData.mimeType}
          onClose={() => setLightboxData(null)}
        />
      )}

      {/* Comments Section */}
      <section>
        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Komentar ({totalComments})
        </h2>

        {/* Primary Comment form */}
        <div className="mb-6">
          <CommentForm
            placeholder="Tulis komentar atau reaksi (anonim)..."
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
                onPreviewImage={(url, title) =>
                  setLightboxData({
                    title: title || "Gambar Komentar",
                    url,
                    mimeType: "image/jpeg",
                  })
                }
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
