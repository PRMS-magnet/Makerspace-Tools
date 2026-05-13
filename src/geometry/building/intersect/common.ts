export function pitchTangent(unit: { pitchRise: number; pitchRun: number }): number {
  return unit.pitchRise / unit.pitchRun;
}

export function valleyPlanAngle(mMain: number, mWing: number): number {
  return Math.atan(mWing / mMain);
}

export function valleyPitchTan(mMain: number, mWing: number): number {
  return (mWing * mMain) / Math.sqrt(mMain * mMain + mWing * mWing);
}

export function valley3DLengthPerUnitT(mMain: number, mWing: number): number {
  const r = mWing / mMain;
  return Math.sqrt(1 + r * r + mWing * mWing);
}

export interface WingHostGeometry {
  Y_main: number;
  S_wing: number;
  m_main: number;
  m_wing: number;
}

export function wingRidgeEndpointY(g: WingHostGeometry): number {
  return g.Y_main - (g.m_wing / g.m_main) * (g.S_wing / 2);
}

export function wingRidgeLengthIn(g: {
  L_wing: number;
  S_wing: number;
  m_main: number;
  m_wing: number;
}): number {
  return g.L_wing + (g.m_wing / g.m_main) * (g.S_wing / 2);
}

export interface JackRafterRunInput {
  yJack: number;
  Y_main: number;
  S_wing: number;
  m_main: number;
  m_wing: number;
}

export function jackRafterRunIn(j: JackRafterRunInput): number {
  return (j.m_main / j.m_wing) * (j.Y_main - j.yJack);
}

export function isJackRafterY(j: JackRafterRunInput): boolean {
  const yEnd = wingRidgeEndpointY(j);
  return j.yJack >= yEnd && j.yJack <= j.Y_main;
}
