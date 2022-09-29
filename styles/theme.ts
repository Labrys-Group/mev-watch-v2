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
  red: {
    50: "#FFE5E5",
    100: "#FFB8B8",
    200: "#FF8A8A",
    300: "#FF5C5C",
    400: "#FF2E2E",
    500: "#FF0000",
    600: "#CC0000",
    700: "#990000",
    800: "#660000",
    900: "#330000",
  },
};

export const theme = extendTheme({
  fonts,
  colors: {},
});
