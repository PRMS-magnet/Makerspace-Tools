export interface DiagramTokens {
  fillWood: string;
  strokeWood: string;
  fillStruct: string;
  strokeStruct: string;
  fillWall: string;
  strokeWall: string;
  fillRidge: string;
  strokeRidge: string;
  line: string;
  text: string;
  background: string;
}

export const LIGHT_TOKENS: DiagramTokens = {
  fillWood: '#FAC775',
  strokeWood: '#854F0B',
  fillStruct: '#CECBF6',
  strokeStruct: '#3C3489',
  fillWall: '#D3D1C7',
  strokeWall: '#444441',
  fillRidge: '#B5D8A8',
  strokeRidge: '#406834',
  line: '#5F5E5A',
  text: '#2C2C2A',
  background: '#FBFAF6',
};

export const DARK_TOKENS: DiagramTokens = {
  fillWood: '#FAC775',
  strokeWood: '#D89A55',
  fillStruct: '#CECBF6',
  strokeStruct: '#9389DC',
  fillWall: '#D3D1C7',
  strokeWall: '#A8A69A',
  fillRidge: '#B5D8A8',
  strokeRidge: '#6E9D5C',
  line: '#C4C2BD',
  text: '#ECECEA',
  background: '#2A2A28',
};

export function getCurrentTokens(): DiagramTokens {
  if (typeof document === 'undefined') return LIGHT_TOKENS;
  return document.documentElement.dataset.theme === 'dark' ? DARK_TOKENS : LIGHT_TOKENS;
}
