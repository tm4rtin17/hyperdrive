import { api } from '@/shared/lib/api/client';

export type EngineeringMasterStatus = 'Draft' | 'Released';

export type Step = {
  id: string;
  order: number;
  text: string;
};

export type Operation = {
  id: string;
  sequence: number;
  name: string;
  steps: Step[];
};

export type EngineeringMaster = {
  id: string;
  partNumber: string;
  partId: string | null;
  partName: string | null;
  status: EngineeringMasterStatus;
  createdAt: string;
  operations: Operation[];
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

  addStep: (id: string, opId: string, text: string) =>
    api<Step>(`${base}/${id}/operations/${opId}/steps`, { method: 'POST', body: { text } }),

  updateStep: (id: string, opId: string, stepId: string, text: string) =>
    api<void>(`${base}/${id}/operations/${opId}/steps/${stepId}`, { method: 'PUT', body: { text } }),

  removeStep: (id: string, opId: string, stepId: string) =>
    api<void>(`${base}/${id}/operations/${opId}/steps/${stepId}`, { method: 'DELETE' }),
};
