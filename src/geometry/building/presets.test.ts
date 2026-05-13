import { describe, it, expect } from 'vitest';
import { BUILTIN_BUILDING_PRESETS } from './presets';
import { buildingCutlist } from './compose';

describe('BUILTIN_BUILDING_PRESETS', () => {
  it('contains the three Cycle A presets', () => {
    const ids = BUILTIN_BUILDING_PRESETS.map((p) => p.id);
    expect(ids).toContain('l-plan-cottage');
    expect(ids).toContain('t-plan-farmhouse');
    expect(ids).toContain('cross-gable-cape');
  });

  it('each preset produces a valid cut SVG', () => {
    for (const preset of BUILTIN_BUILDING_PRESETS) {
      const out = buildingCutlist(preset.building);
      expect(out.cutSvg.length).toBeGreaterThan(100);
    }
  });

  it('each preset produces a non-empty plan-view SVG', () => {
    for (const preset of BUILTIN_BUILDING_PRESETS) {
      const out = buildingCutlist(preset.building);
      expect(out.planDiagramSvg).toContain('<svg');
    }
  });
});
