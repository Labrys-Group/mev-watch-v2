import {
  Text,
  ListItem,
  chakra,
  Button,
  IconButton,
  Link,
} from "@chakra-ui/react";

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
    color: "white",
  },
});

export const DefaultText = chakra(Text, {
  baseStyle: {
    fontSize: "16px",
    fontFamily: "GT-America-Mono-Medium",
    color: "white",
    marginBottom: "20px",
  },
});

export const StyledIconBtn = chakra(IconButton, {
  baseStyle: {
    position: "relative",
    background: "transparent",
    top: "0px",
    left: "0px",
    color: "white",
    _hover: {
      background: "transparent",
      color: "brightGreen.500",
    },
  },
});

export const StyledBtn = chakra(Button, {
  baseStyle: {
    position: "relative",
    background: "transparent",
    border: "1px solid #00FFA7",
    top: "0px",
    left: "0px",
    color: "white",
    margin: "0 5px",
    fontSize: "14px",
    padding: "-5px 10px",
    _hover: {
      background: "#00FFA7",
      color: "black",
    },
  },
});

export const StyledLink = chakra(Link, {
  baseStyle: {
    color: "white",
    marginX: "10px",
    _hover: {
      textDecor: "none",
      color: "brightGreen.500",
    },
  },
});
