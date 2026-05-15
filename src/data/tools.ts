export type ToolStatus = 'ready' | 'planned' | 'later';

export interface Tool {
  slug: string;
  name: string;
  blurb: string;
  status: ToolStatus;
}

export const TOOLS: Tool[] = [
  {
    slug: 'roof',
    name: 'Roof cutlist',
    blurb:
      'Generates a flat laser-cut layout and a side-view diagram from one parameter set.',
    status: 'ready',
  },
  {
    slug: 'wall',
    name: 'Stud wall cutlist',
    blurb: 'Configurable stud + plate cut list with optional horizontal blocking.',
    status: 'planned',
  },
  ];
