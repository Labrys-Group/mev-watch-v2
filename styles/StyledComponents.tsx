import { Text, ListItem, chakra } from "@chakra-ui/react";

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
