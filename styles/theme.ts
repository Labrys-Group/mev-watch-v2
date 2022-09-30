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
    50: "#FCE9E9",
    100: "#F7C0C0",
    200: "#F19898",
    300: "#EC6F6F",
    400: "#E64747",
    500: "#C34944",
    600: "#AC403C",
    700: "#9F2D27",
    800: "#9F2D27",
    900: "#2D0606",
  },
};

export const theme = extendTheme({
  fonts,
  colors,
});
