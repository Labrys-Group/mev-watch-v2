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

  export type DetailedColorGradient =
  | 50
  | 100
  | 150
  | 200
  | 250
  | 300
  | 400
  | 500
  | 550
  | 600
  | 650
  | 700
  | 750
  | 800
  | 850
  | 900;

type ColorLookup = Record<ColorGradient, string>;

export interface ColorTheme {
  brightGreen: ColorLookup;
  brightRed: ColorLookup;
  greenBarGradient: ColorLookup;
  redBarGradient: ColorLookup;
}
