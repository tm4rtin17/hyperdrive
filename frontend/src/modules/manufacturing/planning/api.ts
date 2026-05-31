import { api } from '@/shared/lib/api/client';

export type EngineeringMasterStatus = 'Draft' | 'Released';

export type StepAttachment = {
  id: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  uploadedAt: string;
};

export type Step = {
  id: string;
  order: number;
  title: string;
  body: string;
  attachments: StepAttachment[];
};

export type Operation = {
  id: string;
  sequence: number;
  name: string;
  steps: Step[];
};

export type OperationLink = {
  predecessorId: string;
  successorId: string;
};

export type EngineeringMaster = {
  id: string;
  partNumber: string;
  partId: string | null;
  partName: string | null;
  status: EngineeringMasterStatus;
  createdAt: string;
  operations: Operation[];
  dependencies: OperationLink[];
};

export type EngineeringMasterSummary = {
  id: string;
  partNumber: string;
  partName: string | null;
  status: EngineeringMasterStatus;
  createdAt: string;
  operationCount: number;
};

export type CreateMasterInput = {
  partNumber: string;
  partId: string | null;
  partName: string | null;
};

const base = '/api/manufacturing/engineering-masters';
const stepBase = (id: string, opId: string, stepId: string) =>
  `${base}/${id}/operations/${opId}/steps/${stepId}`;

export const mastersApi = {
  list: (opts?: { search?: string }) => {
    const qs = opts?.search ? `?search=${encodeURIComponent(opts.search)}` : '';
    return api<EngineeringMasterSummary[]>(`${base}${qs}`);
  },

  get: (id: string) => api<EngineeringMaster>(`${base}/${id}`),

  create: (input: CreateMasterInput) =>
    api<EngineeringMaster>(base, { method: 'POST', body: input }),

  addOperation: (id: string, name: string) =>
    api<Operation>(`${base}/${id}/operations`, { method: 'POST', body: { name } }),

  updateOperation: (id: string, opId: string, input: { sequence: number; name: string }) =>
    api<void>(`${base}/${id}/operations/${opId}`, { method: 'PUT', body: input }),

  removeOperation: (id: string, opId: string) =>
    api<void>(`${base}/${id}/operations/${opId}`, { method: 'DELETE' }),

  updateSequence: (id: string, links: OperationLink[]) =>
    api<void>(`${base}/${id}/sequence`, { method: 'PUT', body: { links } }),

  addStep: (id: string, opId: string, title: string) =>
    api<Step>(`${base}/${id}/operations/${opId}/steps`, { method: 'POST', body: { title } }),

  updateStep: (id: string, opId: string, stepId: string, input: { order: number; title: string; body: string }) =>
    api<void>(`${stepBase(id, opId, stepId)}`, { method: 'PUT', body: input }),

  removeStep: (id: string, opId: string, stepId: string) =>
    api<void>(`${stepBase(id, opId, stepId)}`, { method: 'DELETE' }),

  uploadAttachment: (id: string, opId: string, stepId: string, file: File): Promise<StepAttachment> => {
    const fd = new FormData();
    fd.append('file', file);
    return fetch(`${stepBase(id, opId, stepId)}/attachments`, { method: 'POST', body: fd })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.detail ?? 'Upload failed.');
        return data as StepAttachment;
      });
  },

  deleteAttachment: (id: string, opId: string, stepId: string, attachmentId: string) =>
    api<void>(`${stepBase(id, opId, stepId)}/attachments/${attachmentId}`, { method: 'DELETE' }),

  attachmentFileUrl: (id: string, opId: string, stepId: string, attachmentId: string) =>
    `${stepBase(id, opId, stepId)}/attachments/${attachmentId}/file`,
};
