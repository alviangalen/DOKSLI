export type FileEntry = {
  id: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  created_at: string;
};

export type Comment = {
  id: string;
  comment_text: string;
  posted_at: string;
};

export type Doksli = {
  id: string;
  name: string;
  description: string | null;
  files: FileEntry[];
  comments: Comment[];
  created_at: string;
  view_count: number;
  files_count?: number;
  comments_count?: number;
};

const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  (typeof window !== "undefined" && window.location.port !== "8000" && window.location.port !== "80" && window.location.port !== "443" && window.location.port !== ""
    ? `${window.location.protocol}//${window.location.hostname}:8000/api`
    : "/api");

export async function fetchDokslis(): Promise<Doksli[]> {
  const res = await fetch(`${API_BASE}/dokslis`);
  if (!res.ok) throw new Error('Gagal mengambil daftar doksli');
  const json = await res.json();
  return json.data;
}

export async function fetchDoksli(id: string): Promise<Doksli> {
  const res = await fetch(`${API_BASE}/dokslis/${id}`);
  if (!res.ok) throw new Error('Gagal mengambil detail doksli');
  const json = await res.json();
  return json.data;
}

export async function createDoksli(
  name: string,
  description: string,
  files: File[]
): Promise<Doksli> {
  const formData = new FormData();
  formData.append('name', name);
  if (description) formData.append('description', description);
  for (let i = 0; i < files.length; i++) {
    formData.append('files[]', files[i]);
  }

  const res = await fetch(`${API_BASE}/dokslis`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.message || 'Gagal membuat doksli baru');
  }

  const json = await res.json();
  return json.data;
}

export async function incrementDoksliView(id: string): Promise<number> {
  try {
    const res = await fetch(`${API_BASE}/dokslis/${id}/view`, {
      method: 'POST',
    });
    if (!res.ok) return 0;
    const json = await res.json();
    return json.view_count;
  } catch {
    return 0;
  }
}

export async function addDoksliComment(id: string, text: string): Promise<Comment> {
  const res = await fetch(`${API_BASE}/dokslis/${id}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) throw new Error('Gagal menambahkan komentar');
  const json = await res.json();
  return json.data;
}

export function getFileViewUrl(fileId: string): string {
  return `${API_BASE}/files/${fileId}/view`;
}
