import {
  Text,
  ListItem,
  chakra,
  Button,
  IconButton,
  Link,
  Flex,
  Switch,
  HStack,
} from "@chakra-ui/react";

export const PageTitle = chakra(Text, {
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

export const DefaultContainer = chakra(Flex, {
  baseStyle: {
    flexDirection: "column",
    width: "100%",
    background: "#0f0f0f",
    borderRadius: "10px",
    border: "1px solid #393939",
    padding: "20px",
    marginY: "40px",
    boxShadow: "rgba(0, 0, 0, 0.56) 0px 22px 70px 4px",
  },
});

export const DefaultTitle = chakra(Text, {
  baseStyle: {
    // fontFamily: "GT-America-Extended-Bold",
    textAlign: "center",
    fontSize: "1.5rem",
    fontWeight: "bold",
    color: "white",
  },
});

export const DefaultListItem = chakra(ListItem, {
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

export const LabrysGreenText = chakra(Text, {
  baseStyle: {
    fontFamily: "GT-America-Mono-Medium",
    color: "#00FFA7",
  },
});

export const DefaultIconBtn = chakra(IconButton, {
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

export const DefaultBtn = chakra(Button, {
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

export const DefaultLink = chakra(Link, {
  baseStyle: {
    color: "white",
    marginX: "10px",
    _hover: {
      textDecor: "none",
      color: "brightGreen.500",
    },
  },
});

interface DefaultSwitchProps {
  label: string;
  isChecked: boolean;
  onChange: VoidFunction;
  // TODO: fix type
  size?: string;
  colorScheme?: string;
}

export const DefaultSwitch = (props: DefaultSwitchProps) => {
  const {
    label,
    isChecked,
    onChange,
    size = "sm",
    colorScheme = "brightGreen",
  } = props;
  return (
    <HStack>
      <Switch
        size={size}
        onChange={onChange}
        isChecked={isChecked}
        colorScheme={colorScheme}
      ></Switch>
      <DefaultText fontSize="14px">{label}</DefaultText>
    </HStack>
  );
};
