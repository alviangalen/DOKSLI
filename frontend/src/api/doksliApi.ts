export type FileEntry = {
  id: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  created_at: string;
};

export type Comment = {
  id: string;
  doksli_id: string;
  parent_id?: string | null;
  comment_text?: string | null;
  image_url?: string | null;
  posted_at: string;
  replies?: Comment[];
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

export type AdminStats = {
  total_dokslis: number;
  total_files: number;
  total_comments: number;
  total_storage_bytes: number;
  total_views: number;
};

export type AdminUser = {
  id: string;
  username: string;
  last_login_at?: string | null;
  last_login_ip?: string | null;
};

const API_BASE = '/api';
const ADMIN_TOKEN_KEY = 'doksli_admin_session_token';

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

function getAdminAuthHeaders(): Record<string, string> {
  const token = getAdminToken();
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['X-Admin-Token'] = token;
  }
  return headers;
}

// ─── Public API ───────────────────────────────────────────────────────────────

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

export async function addDoksliComment(
  id: string,
  text?: string,
  parentId?: string | null,
  imageFile?: File | null,
  imageUrl?: string | null
): Promise<Comment> {
  const formData = new FormData();
  if (text) formData.append('text', text);
  if (parentId) formData.append('parent_id', parentId);
  if (imageFile) formData.append('image', imageFile);
  if (imageUrl) formData.append('image_url', imageUrl);

  const res = await fetch(`${API_BASE}/dokslis/${id}/comments`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.message || 'Gagal menambahkan komentar');
  }
  const json = await res.json();
  return json.data;
}

export function getFileViewUrl(fileId: string): string {
  return `${API_BASE}/files/${fileId}/view`;
}

// ─── Admin API ────────────────────────────────────────────────────────────────

export async function adminLogin(username: string, password: string): Promise<{ username: string; token: string }> {
  const res = await fetch(`${API_BASE}/admin/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.message || 'Login gagal. Periksa username dan password.');
  }

  setAdminToken(json.data.token);
  return json.data;
}

export async function adminCheckAuth(): Promise<AdminUser> {
  const res = await fetch(`${API_BASE}/admin/me`, {
    headers: getAdminAuthHeaders(),
  });

  if (!res.ok) {
    clearAdminToken();
    throw new Error('Sesi admin tidak valid');
  }

  const json = await res.json();
  return json.data;
}

export async function adminGetStats(): Promise<AdminStats> {
  const res = await fetch(`${API_BASE}/admin/stats`, {
    headers: getAdminAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error('Gagal memuat statistik admin');
  }

  const json = await res.json();
  return json.data;
}

export async function adminGetDokslis(page: number = 1, search: string = ''): Promise<{ data: Doksli[]; current_page: number; last_page: number; total: number }> {
  const params = new URLSearchParams({ page: String(page) });
  if (search.trim()) params.set('search', search.trim());

  const res = await fetch(`${API_BASE}/admin/dokslis?${params.toString()}`, {
    headers: getAdminAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error('Gagal memuat daftar doksli admin');
  }

  const json = await res.json();
  return json.data;
}

export async function adminDeleteDoksli(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/dokslis/${id}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message || 'Gagal menghapus doksli');
  }
}

export async function adminDeleteComment(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/comments/${id}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message || 'Gagal menghapus komentar');
  }
}

export async function adminChangePassword(currentPassword: string, newPassword: string): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/change-password`, {
    method: 'POST',
    headers: {
      ...getAdminAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.message || 'Gagal mengganti password');
  }
}

export async function adminLogout(): Promise<void> {
  try {
    await fetch(`${API_BASE}/admin/logout`, {
      method: 'POST',
      headers: getAdminAuthHeaders(),
    });
  } finally {
    clearAdminToken();
  }
}
