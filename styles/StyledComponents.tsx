import { Text, ListItem, chakra, IconButton, Link } from "@chakra-ui/react";

export const Title = chakra(Text, {
  baseStyle: {
    fontFamily: "GT-America-Extended-Bold",
    textAlign: "center",
    fontSize: "3rem",
    fontWeight: "bold",
    marginBottom: "20px",
    background:
      "linear-gradient(to right, #00FFD3 0%, #71FFE0 50%, #FFFF00 100%)",
    "-webkit-background-clip": "text",
    "-webkit-text-fill-color": "transparent",
  },
});

export const StyledListItem = chakra(ListItem, {
  baseStyle: {
    fontSize: "16px",
    margin: "0 0 20px 20px",
    fontFamily: "GT-America-Mono-Medium",
    color: "#fff",
  },
});

export const DefaultText = chakra(Text, {
  baseStyle: {
    fontSize: "16px",
    fontFamily: "GT-America-Mono-Medium",
    color: "#fff",
    marginBottom: "20px",
  },
});

export const StyledBtn = chakra(IconButton, {
  baseStyle: {
    position: "relative",
    background: "transparent",
    top: "0px",
    left: "0px",
    color: "#fff",
    _hover: {
      background: "transparent",
      color: "brightGreen.500",
    },
  },
});

export const StyledLink = chakra(Link, {
  baseStyle: {
    color: "#fff",
    marginX: "10px",
    _hover: {
      textDecor: "none",
      color: "brightGreen.500",
    },
  },
});
