import { useState, useEffect, useRef, useCallback } from "react";
import {
  fetchDokslis,
  fetchDoksli,
  createDoksli,
  incrementDoksliView,
  addDoksliComment,
  getFileViewUrl,
  Doksli,
  FileEntry,
  Comment
} from "./api/doksliApi";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function formatSize(bytes: number) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function timeAgo(dateStr: string) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  return `${Math.floor(diff / 86400)} hari lalu`;
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

type Page = "home" | "create" | "detail";

// ─── Component: Header ────────────────────────────────────────────────────────

function Header({ onHome, onCreate }: { onHome: () => void; onCreate: () => void }) {
  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-blue-100 shadow-xs">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <button
          onClick={onHome}
          className="flex items-center gap-2 font-bold text-lg text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
        >
          <span className="text-xl">📂</span>
          <span style={{ fontFamily: "'DM Sans', sans-serif" }}>DOKSLI</span>
        </button>

        <button
          onClick={onCreate}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-500 hover:bg-blue-600 text-white font-medium text-xs rounded-lg transition-colors shadow-xs cursor-pointer"
        >
          <span>+</span>
          <span>Buat Doksli</span>
        </button>
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
}: {
  doksliList: Doksli[];
  loading: boolean;
  error: string | null;
  onOpen: (id: string) => void;
  onCreate: () => void;
  onRetry: () => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = doksliList.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      (d.description && d.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="text-center mb-8">
        <h1
          className="text-2xl sm:text-3xl font-extrabold text-slate-800 mb-2"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Berbagi Dokumen & Meme Asli
        </h1>
        <p className="text-slate-500 text-sm max-w-md mx-auto">
          Upload file original secara anonim. Tanpa akun, tanpa batas waktu.
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
            className="w-full pl-9 pr-4 py-2 bg-white border border-blue-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition"
          />
          <span className="absolute left-3 top-2.5 text-slate-400 text-sm">🔍</span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 bg-white/50 border border-blue-100 rounded-2xl p-8">
          <div className="inline-block animate-spin text-3xl mb-2">🔄</div>
          <p className="text-sm font-medium text-slate-600">Menghubungkan ke server backend...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-600 shadow-xs">
          <div className="text-3xl mb-2">⚠️</div>
          <p className="text-sm font-semibold mb-1">{error}</p>
          <p className="text-xs text-red-500 mb-4">
            Pastikan server Laravel berjalan di port 8000 (<code className="bg-red-100 px-1.5 py-0.5 rounded">php artisan serve --port=8000</code>).
          </p>
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-xl transition-colors cursor-pointer"
          >
            Coba Hubungkan Lagi
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-blue-100 rounded-2xl p-12 text-center text-slate-400 shadow-xs">
          <div className="text-4xl mb-3">📂</div>
          <p className="text-base font-medium text-slate-600 mb-1">Belum ada Doksli</p>
          <p className="text-xs text-slate-400 mb-4">Mulai buat doksli baru dan bagikan file original kamu.</p>
          <button
            onClick={onCreate}
            className="px-4 py-2 bg-blue-500 text-white text-xs font-medium rounded-xl hover:bg-blue-600 transition-colors cursor-pointer"
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
              className="group cursor-pointer bg-white border border-blue-100 hover:border-blue-300 rounded-2xl p-5 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3
                    className="font-semibold text-slate-800 text-base group-hover:text-blue-600 transition-colors line-clamp-2"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {d.name}
                  </h3>
                  <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 font-medium rounded-full flex-shrink-0">
                    {d.files_count ?? d.files?.length ?? 0} file
                  </span>
                </div>

                {d.description && (
                  <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
                    {d.description}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-50 flex items-center justify-between text-xs text-slate-400">
                <span>{formatDate(d.created_at)}</span>
                <div className="flex items-center gap-3">
                  <span>👁️ {d.view_count}</span>
                  <span>💬 {d.comments_count ?? d.comments?.length ?? 0}</span>
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
          className="text-xl font-bold text-slate-800"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Buat Doksli Baru
        </h1>
        <button
          onClick={onCancel}
          className="text-xs text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
        >
          Batal
        </button>
      </div>

      {errorMsg && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 text-xs">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-blue-100 rounded-2xl p-6 shadow-xs space-y-5">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Nama Doksli <span className="text-blue-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="contoh: Foto Asli Meme Cat Vibing"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2 border border-blue-200 rounded-xl text-sm bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Deskripsi (opsional)
          </label>
          <textarea
            rows={3}
            placeholder="Jelaskan asal usul atau detail file yang kamu upload..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3.5 py-2 border border-blue-200 rounded-xl text-sm bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
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
            className="border-2 border-dashed border-blue-200 hover:border-blue-400 bg-blue-50/50 hover:bg-blue-50 rounded-xl p-6 text-center cursor-pointer transition-colors"
          >
            <div className="text-2xl mb-1">📁</div>
            <p className="text-xs font-medium text-blue-600">Klik untuk memilih file</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Gambar, Video, Audio, PDF, Dokumen, Zip (Maks 50MB)
            </p>
          </div>

          {selectedFiles.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {selectedFiles.map((file, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-blue-50/60 border border-blue-100 rounded-lg px-3 py-2 text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span>{fileIcon(file.type)}</span>
                    <span className="font-medium text-slate-700 truncate">{file.name}</span>
                    <span className="text-slate-400">({formatSize(file.size)})</span>
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
            className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-medium rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="px-5 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-200 disabled:cursor-not-allowed text-white text-xs font-medium rounded-xl transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
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

// ─── Component: DetailPage ────────────────────────────────────────────────────

function DetailPage({
  doksli,
  onBack,
  onAddComment,
}: {
  doksli: Doksli;
  onBack: () => void;
  onAddComment: (doksliId: string, text: string) => Promise<void>;
}) {
  const [comment, setComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileEntry | null>(null);

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    setSubmittingComment(true);
    try {
      await onAddComment(doksli.id, comment.trim());
      setComment("");
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-blue-600 transition-colors mb-6 cursor-pointer"
      >
        <span>←</span>
        <span>Kembali ke Beranda</span>
      </button>

      {/* Header Info */}
      <div className="bg-white border border-blue-100 rounded-2xl p-6 shadow-xs mb-6">
        <h1
          className="text-xl sm:text-2xl font-bold text-slate-800 mb-2"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          {doksli.name}
        </h1>

        {doksli.description && (
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            {doksli.description}
          </p>
        )}

        <div className="flex items-center gap-4 text-xs text-slate-400 pt-3 border-t border-slate-100">
          <span>Diupload {formatDate(doksli.created_at)}</span>
          <span>·</span>
          <span>👁️ {doksli.view_count} dilihat</span>
          <span>·</span>
          <span>{doksli.files?.length ?? 0} file</span>
        </div>
      </div>

      {/* Files */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-slate-700 mb-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          File ({doksli.files?.length ?? 0})
        </h2>

        {(!doksli.files || doksli.files.length === 0) ? (
          <div className="bg-white border border-blue-100 rounded-xl p-8 text-center text-slate-400">
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
                className="text-left flex items-center gap-3 bg-white border border-blue-100 rounded-xl p-3 hover:border-blue-300 hover:shadow-sm transition-all group cursor-pointer"
              >
                {f.mime_type.startsWith("image/") ? (
                  <img
                    src={getFileViewUrl(f.id)}
                    alt={f.original_name}
                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-blue-50"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center text-2xl flex-shrink-0">
                    {fileIcon(f.mime_type)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                    {f.original_name}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {fileCategoryLabel(f.mime_type)} · {formatSize(f.file_size)}
                  </p>
                </div>
                <svg
                  className="flex-shrink-0 text-blue-200 group-hover:text-blue-400 transition-colors"
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

      {/* Image preview modal */}
      {previewFile && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/70 flex items-center justify-center p-4"
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
              className="absolute top-3 right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center text-slate-600 hover:bg-white transition-colors cursor-pointer"
              aria-label="Tutup"
            >
              ✕
            </button>
            <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5">
              <p className="text-xs font-medium text-slate-700">{previewFile.original_name}</p>
              <p className="text-xs text-slate-400">{formatSize(previewFile.file_size)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Comments */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Komentar ({doksli.comments?.length ?? 0})
        </h2>

        {/* Comment form */}
        <form onSubmit={handleComment} className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Tulis komentar (anonim)..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="flex-1 px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition"
          />
          <button
            type="submit"
            disabled={submittingComment || !comment.trim()}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-200 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
          >
            Kirim
          </button>
        </form>

        {/* Comment list */}
        {(!doksli.comments || doksli.comments.length === 0) ? (
          <div className="text-center py-8 text-slate-400 border border-dashed border-blue-100 rounded-xl">
            <p className="text-sm">Belum ada komentar. Jadilah yang pertama!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {doksli.comments.map((c) => (
              <div key={c.id} className="bg-white border border-blue-100 rounded-xl px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-blue-500">Anonim</span>
                  <span className="text-xs text-slate-400">{timeAgo(c.posted_at)}</span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">{c.comment_text}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

// ─── App Main ─────────────────────────────────────────────────────────────────

export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [doksliList, setDoksliList] = useState<Doksli[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDoksli, setActiveDoksli] = useState<Doksli | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDokslis();
      setDoksliList(data);
    } catch (err: any) {
      setError("Tidak dapat terhubung ke Backend Laravel API.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpen = async (id: string) => {
    try {
      const detail = await fetchDoksli(id);
      setActiveDoksli(detail);
      setPage("detail");
      const newViewCount = await incrementDoksliView(id);
      if (newViewCount > 0) {
        setActiveDoksli((prev) => (prev ? { ...prev, view_count: newViewCount } : null));
      }
    } catch (err) {
      alert("Gagal memuat detail Doksli.");
    }
  };

  const handleCreate = async (name: string, description: string, files: File[]) => {
    const newDoksli = await createDoksli(name, description, files);
    setActiveDoksli(newDoksli);
    await loadData();
    setPage("detail");
  };

  const handleAddComment = async (doksliId: string, text: string) => {
    const newComment = await addDoksliComment(doksliId, text);
    setActiveDoksli((prev) =>
      prev ? { ...prev, comments: [newComment, ...(prev.comments || [])] } : null
    );
  };

  return (
    <div className="min-h-full" style={{ backgroundColor: "#f0f7ff" }}>
      <Header
        onHome={() => {
          loadData();
          setPage("home");
        }}
        onCreate={() => setPage("create")}
      />

      {page === "home" && (
        <HomePage
          doksliList={doksliList}
          loading={loading}
          error={error}
          onOpen={handleOpen}
          onCreate={() => setPage("create")}
          onRetry={loadData}
        />
      )}

      {page === "create" && (
        <CreatePage
          onSubmit={handleCreate}
          onCancel={() => setPage("home")}
        />
      )}

      {page === "detail" && activeDoksli && (
        <DetailPage
          doksli={activeDoksli}
          onBack={() => {
            loadData();
            setPage("home");
          }}
          onAddComment={handleAddComment}
        />
      )}
    </div>
  );
}
