import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  valleyPlanAngle,
  valleyPitchTan,
  valley3DLengthPerUnitT,
  wingRidgeEndpointY,
  wingRidgeLengthIn,
} from './common';

describe('valleyPlanAngle', () => {
  it('45 degrees for equal pitches', () => {
    expect(valleyPlanAngle(0.5, 0.5)).toBeCloseTo(Math.PI / 4, 9);
    expect(valleyPlanAngle(0.667, 0.667)).toBeCloseTo(Math.PI / 4, 9);
  });

  it('matches arctan(m_wing / m_main)', () => {
    fc.assert(fc.property(
      fc.double({ min: Math.fround(0.1), max: Math.fround(2.0), noNaN: true }),
      fc.double({ min: Math.fround(0.1), max: Math.fround(2.0), noNaN: true }),
      (mMain, mWing) => {
        const actual = valleyPlanAngle(mMain, mWing);
        const expected = Math.atan(mWing / mMain);
        expect(actual).toBeCloseTo(expected, 9);
      },
    ));
  });
});

describe('valleyPitchTan', () => {
  it('m / sqrt(2) for equal pitches', () => {
    const m = 8 / 12;
    expect(valleyPitchTan(m, m)).toBeCloseTo(m / Math.SQRT2, 9);
  });

  it('matches framing-square 17-unit rule for 8/12 within rounding', () => {
    const formula = valleyPitchTan(8 / 12, 8 / 12);
    expect(formula).toBeGreaterThan(0.47);
    expect(formula).toBeLessThan(0.48);
  });
});

describe('valley3DLengthPerUnitT', () => {
  it('sqrt(2 + m^2) for equal pitches', () => {
    const cases = [
      { m: 4 / 12, expected: 1.4529 },
      { m: 6 / 12, expected: 1.5000 },
      { m: 8 / 12, expected: 1.5635 },
      { m: 12 / 12, expected: 1.7321 },
    ];
    for (const c of cases) {
      expect(valley3DLengthPerUnitT(c.m, c.m)).toBeCloseTo(c.expected, 3);
    }
  });
});

describe('wingRidgeEndpointY', () => {
  it('Y_main - (m_wing/m_main) * (S_wing/2)', () => {
    expect(wingRidgeEndpointY({ Y_main: 12, S_wing: 8, m_main: 0.5, m_wing: 0.5 })).toBeCloseTo(8, 9);
  });

  it('equal pitch + equal span gives Y_main/2 (canonical L)', () => {
    expect(wingRidgeEndpointY({ Y_main: 12, S_wing: 12, m_main: 0.5, m_wing: 0.5 })).toBeCloseTo(6, 9);
  });
});

describe('wingRidgeLengthIn', () => {
  it('L_wing + (m_wing/m_main) * (S_wing/2)', () => {
    expect(wingRidgeLengthIn({ L_wing: 10, S_wing: 8, m_main: 0.5, m_wing: 0.5 })).toBeCloseTo(14, 9);
  });
});
