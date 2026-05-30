import { api } from '@/shared/lib/api/client';

export const PART_TYPES = [
  'RawMaterial',
  'Component',
  'Assembly',
  'FinishedGood',
  'Consumable',
  'Tooling',
] as const;
export type PartType = (typeof PART_TYPES)[number];

export const UNITS_OF_MEASURE = ['Each', 'Millimeter', 'Meter', 'Gram', 'Kilogram', 'Liter'] as const;
export type UnitOfMeasure = (typeof UNITS_OF_MEASURE)[number];

export const SOURCING_TYPES = ['Make', 'Buy'] as const;
export type SourcingType = (typeof SOURCING_TYPES)[number];

export const TRACEABILITY_TYPES = ['None', 'Lot', 'Serial'] as const;
export type TraceabilityType = (typeof TRACEABILITY_TYPES)[number];

export const SERIAL_ASSIGNMENTS = ['Manual', 'Auto'] as const;
export type SerialAssignment = (typeof SERIAL_ASSIGNMENTS)[number];

/** Human-friendly labels for enum values that aren't self-explanatory. */
export const PART_TYPE_LABELS: Record<PartType, string> = {
  RawMaterial: 'Raw Material',
  Component: 'Component',
  Assembly: 'Assembly',
  FinishedGood: 'Finished Good',
  Consumable: 'Consumable',
  Tooling: 'Tooling',
};

export const SERIAL_ASSIGNMENT_LABELS: Record<SerialAssignment, string> = {
  Manual: 'Manual — user-defined scheme',
  Auto: 'Auto — system-generated',
};

export type PartSummary = {
  id: string;
  partNumber: string;
  name: string;
  revision: string;
  lifecycle: string;
  createdAt: string;
  isArchived: boolean;
  partType: PartType;
  traceabilityType: TraceabilityType;
};

export type Part = {
  id: string;
  partNumber: string;
  name: string;
  revision: string;
  lifecycle: string;
  createdAt: string;
  isArchived: boolean;
  partType: PartType;
  unitOfMeasure: UnitOfMeasure;
  sourcing: SourcingType;
  material: string | null;
  massGrams: number | null;
  traceabilityType: TraceabilityType;
  serialAssignment: SerialAssignment | null;
  serialFormat: string | null;
};

export type UpdatePartInput = {
  partType: PartType;
  unitOfMeasure: UnitOfMeasure;
  sourcing: SourcingType;
  material: string | null;
  massGrams: number | null;
  traceabilityType: TraceabilityType;
  serialAssignment: SerialAssignment | null;
  serialFormat: string | null;
};

export const partsApi = {
  list: (opts?: { search?: string; includeArchived?: boolean }) => {
    const params = new URLSearchParams();
    if (opts?.search) params.set('search', opts.search);
    if (opts?.includeArchived) params.set('includeArchived', 'true');
    const qs = params.toString();
    return api<PartSummary[]>(`/api/engineering/parts${qs ? `?${qs}` : ''}`);
  },

  get: (id: string) => api<Part>(`/api/engineering/parts/${id}`),

  getByNumber: (partNumber: string) =>
    api<Part>(`/api/engineering/parts/by-number/${encodeURIComponent(partNumber)}`),

  create: (input: { partNumber: string; name: string }) =>
    api<Part>('/api/engineering/parts', { method: 'POST', body: input }),

  update: (id: string, input: UpdatePartInput) =>
    api<Part>(`/api/engineering/parts/${id}`, { method: 'PUT', body: input }),

  remove: (id: string) =>
    api<void>(`/api/engineering/parts/${id}`, { method: 'DELETE' }),

  restore: (id: string) =>
    api<void>(`/api/engineering/parts/${id}/restore`, { method: 'POST' }),
};
