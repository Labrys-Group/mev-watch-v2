import { extendTheme } from "@chakra-ui/react";
import { ColorTheme } from "../types";

const fonts = {
  heading: "GT-America-Mono-Medium",
  body: "Lexend Deca",
};

export const colors: ColorTheme = {
  brightGreen: {
    50: "#E5FFF6",
    100: "#B8FFE6",
    200: "#8AFFD7",
    300: "#5CFFC7",
    400: "#2EFFB7",
    500: "#00FFA7",
    600: "#00CC86",
    700: "#009964",
    800: "#006643",
    900: "#003321",
  },
  brightRed: {
    50: "#FBE9E9",
    100: "#F4C2C2",
    200: "#EE9B9B",
    300: "#E77474",
    400: "#E04D4D",
    500: "#D92626",
    600: "#AE1E1E",
    700: "#821717",
    800: "#570F0F",
    900: "#2B0808",
  },
  greenBarGradient: {
    50: "#00FFA7",
    100: "#00EC9B",
    200: "#00DA8F",
    300: "#00C782",
    400: "#00B576",
    500: "#00A26A",
    600: "#00905E",
    700: "#007D52",
    800: "#006B46",
    900: "#005839",
  },
  redBarGradient: {
    50: "#D92626",
    100: "#C92323",
    200: "#B92121",
    300: "#AA1E1E",
    400: "#9A1B1B",
    500: "#8A1818",
    600: "#7A1616",
    700: "#6A1313",
    800: "#5A1010",
    900: "#4B0D0D",
  },
};

export const theme = extendTheme({
  fonts,
  colors,
});
