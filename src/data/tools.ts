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
  ];
