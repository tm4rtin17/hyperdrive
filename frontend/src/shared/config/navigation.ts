/**
 * Single source of truth for both the top-nav dropdowns and the splash tiles.
 * Adding a new module is one entry here.
 */

export type SubmoduleDefinition = {
  id: string;
  label: string;
  href: string;
  /** One-line operator-facing summary. Shown on splash tile + dropdown. */
  blurb: string;
};

export type ModuleDefinition = {
  id: string;
  label: string;
  /** Short marketing-free description of the module's purpose. */
  purpose: string;
  /** Color used on splash tile accent strip. Keep deliberate — not rainbow. */
  accent: 'amber' | 'cyan' | 'violet' | 'teal';
  submodules: SubmoduleDefinition[];
};

export const NAVIGATION: ModuleDefinition[] = [
  {
    id: 'engineering',
    label: 'Engineering',
    purpose: 'Product definition: parts, revisions, BOMs, and engineering change.',
    accent: 'cyan',
    submodules: [
      {
        id: 'parts',
        label: 'Part Portal',
        href: '/engineering/parts',
        blurb: 'Define parts, revisions, and engineering attributes.',
      },
      {
        id: 'lifecycle',
        label: 'Lifecycle Management',
        href: '/engineering/lifecycle',
        blurb: 'Manage BOMs, revision control, and engineering change.',
      },
    ],
  },
  {
    id: 'manufacturing',
    label: 'Manufacturing',
    purpose: 'Planning and shop-floor execution of released engineering definitions.',
    accent: 'amber',
    submodules: [
      {
        id: 'planning',
        label: 'Manufacturing Planning',
        href: '/manufacturing/planning',
        blurb: 'Author routings, work instructions, and release work orders.',
      },
      {
        id: 'execution',
        label: 'Work Order Execution',
        href: '/manufacturing/execution',
        blurb: 'Operator workflows, in-process data capture, and traceability.',
      },
    ],
  },
];
