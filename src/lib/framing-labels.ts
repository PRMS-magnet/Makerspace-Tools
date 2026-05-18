import type { FramingMode } from '../geometry/framing/types';

export interface FramingLabels {
  toolTitle: string;
  lengthLabel: string;
  spanLabel: string;
  memberSingular: string;
  memberPlural: string;
  memberSpacingLabel: string;
  memberDepthLabel: string;
  nOverrideToggleLabel: string;
  nOverrideValueLabel: string;
  endCapNoun: string;
  endCapALabel: string;
  endCapBLabel: string;
  doubleEndCapBLabel: string;
  blockingNoun: string;
  diagramViewLabel: string;
}

export const MODE_LABELS: Record<FramingMode, FramingLabels> = {
  wall: {
    toolTitle: 'Stud wall cutlist',
    lengthLabel: 'Wall width (in)',
    spanLabel: 'Wall height (in)',
    memberSingular: 'stud',
    memberPlural: 'studs',
    memberSpacingLabel: 'Stud spacing (in, o.c.)',
    memberDepthLabel: 'Stud depth into wall (in)',
    nOverrideToggleLabel: 'Override stud count',
    nOverrideValueLabel: 'Stud count',
    endCapNoun: 'plate',
    endCapALabel: 'Bottom plate height (in)',
    endCapBLabel: 'Top plate height (in)',
    doubleEndCapBLabel: 'Double top plate',
    blockingNoun: 'Blocking',
    diagramViewLabel: 'Front view',
  },
  floor: {
    toolTitle: 'Joist floor cutlist',
    lengthLabel: 'Floor width (in, across joists)',
    spanLabel: 'Floor depth (in, along joists)',
    memberSingular: 'joist',
    memberPlural: 'joists',
    memberSpacingLabel: 'Joist spacing (in, o.c.)',
    memberDepthLabel: 'Joist depth (in)',
    nOverrideToggleLabel: 'Override joist count',
    nOverrideValueLabel: 'Joist count',
    endCapNoun: 'rim',
    endCapALabel: 'Front rim height (in)',
    endCapBLabel: 'Back rim height (in)',
    doubleEndCapBLabel: 'Doubled back rim',
    blockingNoun: 'Mid-span blocking',
    diagramViewLabel: 'Top view',
  },
};

export function getLabels(mode: FramingMode): FramingLabels {
  return MODE_LABELS[mode];
}
