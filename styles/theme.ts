import { extendTheme } from "@chakra-ui/react";

const fonts = {
  heading: "GT-America-Mono-Medium",
  body: "Lexend Deca",
};

export const colors = {
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
};

export const theme = extendTheme({
  fonts,
  colors,
});
