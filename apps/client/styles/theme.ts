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
};

export const theme = extendTheme({
  fonts,
  colors,
});
