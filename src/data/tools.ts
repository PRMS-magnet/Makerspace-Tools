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
    status: 'ready',
  },
  {
    slug: 'floor',
    name: 'Stud floor cutlist',
    blurb: 'Joist + rim cut list with optional mid-span blocking.',
    status: 'ready',
  },
  ];
