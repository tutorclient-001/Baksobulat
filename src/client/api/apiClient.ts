import { ApiResponse } from '../../shared/types.js';

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('bank_soal_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('bank_soal_token', token);
    } else {
      localStorage.removeItem('bank_soal_token');
    }
  }

  getToken(): string | null {
    return this.token || localStorage.getItem('bank_soal_token');
  }

  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const token = this.getToken();

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle binary/stream responses
      const contentType = response.headers.get('content-type');
      if (
        contentType?.includes('application/pdf') ||
        contentType?.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') ||
        contentType?.includes('application/octet-stream')
      ) {
        if (!response.ok) {
          throw new Error(`HTTP Error ${response.status}: Failed to download file`);
        }
        const blob = await response.blob();
        return {
          success: true,
          data: blob as any,
        };
      }

      const json = await response.json();

      if (!response.ok) {
        if (response.status === 401 && !endpoint.includes('/auth/login')) {
          this.setToken(null);
          window.location.href = '/login';
        }
        throw new Error(json.error?.message || `Terjadi kesalahan sistem (Status: ${response.status})`);
      }

      return json;
    } catch (err: any) {
      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: err.message || 'Gagal menghubungi server.',
        },
      };
    }
  }

  async get<T = any>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    let url = endpoint;
    if (params) {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          query.append(key, String(val));
        }
      });
      const qs = query.toString();
      if (qs) url += (url.includes('?') ? '&' : '?') + qs;
    }
    return this.request<T>(url, { method: 'GET' });
  }

  async post<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    const isForm = body instanceof FormData;
    return this.request<T>(endpoint, {
      method: 'POST',
      body: isForm ? body : JSON.stringify(body),
    });
  }

  async put<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    const isForm = body instanceof FormData;
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: isForm ? body : JSON.stringify(body),
    });
  }

  async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async downloadBlob(endpoint: string, defaultFilename: string): Promise<void> {
    const res = await this.request<Blob>(endpoint, { method: 'GET' });
    if (res.success && res.data) {
      const blob = res.data as unknown as Blob;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = defaultFilename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } else {
      throw new Error(res.error?.message || 'Gagal mengunduh file.');
    }
  }
}

export const apiClient = new ApiClient();
