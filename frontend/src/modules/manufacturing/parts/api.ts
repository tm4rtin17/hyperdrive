import { api } from '@/shared/lib/api/client';

export type PartSummary = {
  id: string;
  partNumber: string;
  name: string;
  revision: string;
  lifecycle: string;
  createdAt: string;
};

export type Part = PartSummary & {
  attributes: Record<string, string>;
};

export const partsApi = {
  list: (search?: string) =>
    api<PartSummary[]>(`/api/manufacturing/parts${search ? `?search=${encodeURIComponent(search)}` : ''}`),

  get: (id: string) => api<Part>(`/api/manufacturing/parts/${id}`),

  create: (input: { partNumber: string; name: string }) =>
    api<Part>('/api/manufacturing/parts', { method: 'POST', body: input }),

  assignAttribute: (id: string, key: string, value: string) =>
    api<void>(`/api/manufacturing/parts/${id}/attributes`, { method: 'POST', body: { key, value } }),
};
