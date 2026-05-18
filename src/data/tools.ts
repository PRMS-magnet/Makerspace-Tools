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
    slug: 'framing',
    name: 'Framing cutlist (wall + floor)',
    blurb: 'Stud + plate (wall mode) or joist + rim (floor mode) cut list with optional blocking. Switch mode in the form.',
    status: 'ready',
  },
];
