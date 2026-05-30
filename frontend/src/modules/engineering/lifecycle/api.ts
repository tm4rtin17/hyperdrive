import { api } from '@/shared/lib/api/client';

export type RevisionLifecycle = 'InWork' | 'Released' | 'Obsolete';

export type PartRevision = {
  id: string;
  rev: string;
  lifecycle: RevisionLifecycle;
  ordinal: number;
  createdAt: string;
  releasedAt: string | null;
  lineCount: number;
};

export type BomLine = {
  id: string;
  childPartId: string;
  childPartNumber: string;
  childName: string;
  childPartType: string;
  quantity: number;
  findNumber: number | null;
  referenceDesignator: string | null;
};

export type AddBomLineInput = {
  childPartNumber: string;
  quantity: number;
  findNumber: number | null;
  referenceDesignator: string | null;
};

export type UpdateBomLineInput = {
  quantity: number;
  findNumber: number | null;
  referenceDesignator: string | null;
};

const base = (partId: string) => `/api/engineering/parts/${partId}/revisions`;

export const lifecycleApi = {
  listRevisions: (partId: string) => api<PartRevision[]>(base(partId)),

  createNextRevision: (partId: string) =>
    api<PartRevision>(base(partId), { method: 'POST' }),

  releaseRevision: (partId: string, revId: string) =>
    api<void>(`${base(partId)}/${revId}/release`, { method: 'POST' }),

  obsoleteRevision: (partId: string, revId: string) =>
    api<void>(`${base(partId)}/${revId}/obsolete`, { method: 'POST' }),

  restoreRevision: (partId: string, revId: string) =>
    api<void>(`${base(partId)}/${revId}/restore`, { method: 'POST' }),

  getBom: (partId: string, revId: string) =>
    api<BomLine[]>(`${base(partId)}/${revId}/bom`),

  addBomLine: (partId: string, revId: string, input: AddBomLineInput) =>
    api<void>(`${base(partId)}/${revId}/bom`, { method: 'POST', body: input }),

  updateBomLine: (partId: string, revId: string, lineId: string, input: UpdateBomLineInput) =>
    api<void>(`${base(partId)}/${revId}/bom/${lineId}`, { method: 'PUT', body: input }),

  removeBomLine: (partId: string, revId: string, lineId: string) =>
    api<void>(`${base(partId)}/${revId}/bom/${lineId}`, { method: 'DELETE' }),
};
