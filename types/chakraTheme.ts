export type ColorGradient =
  | 50
  | 100
  | 200
  | 300
  | 400
  | 500
  | 600
  | 700
  | 800
  | 900;

type ColorLookup = Record<ColorGradient, string>;

export interface ColorTheme {
  brightGreen: ColorLookup;
  red: ColorLookup;
}
