import { chakra, HStack, Switch, useBoolean } from "@chakra-ui/react";
import { createContext, ReactNode } from "react";
import { DefaultText } from "../styles/StyledComponents";

interface StatsProviderProps {
  includeAllBlocks: boolean;
  AllBlocksToggle: React.ReactElement;
}

const defaultContext: StatsProviderProps = {
  includeAllBlocks: true,
  AllBlocksToggle: <></>,
};

const StatsContext = createContext<StatsProviderProps>(defaultContext);

const StatsContextProvider = ({ children }: { children: ReactNode }) => {
  const [includeAllBlocks, setIncludeAllBlocks] = useBoolean(true);

  const AllBlocksToggle = (
    <HStack>
      <Switch
        size="sm"
        onChange={setIncludeAllBlocks.toggle}
        isChecked={includeAllBlocks}
        colorScheme="brightGreen"
      />
      <AllBlocksToggleText
        onClick={setIncludeAllBlocks.toggle}
        fontSize="14px"
        color={includeAllBlocks ? "brightGreen.500" : "white"}
      >
        Include all Blocks
      </AllBlocksToggleText>
    </HStack>
  );

  return (
    <StatsContext.Provider
      value={{
        includeAllBlocks,
        AllBlocksToggle: AllBlocksToggle,
      }}
    >
      {children}
    </StatsContext.Provider>
  );
};

const AllBlocksToggleText = chakra(DefaultText, {
  baseStyle: {
    _hover: {
      cursor: "pointer",
    },
    WebkitTouchCallout: "none",
    userSelect: "none",
  },
});

export { StatsContext, StatsContextProvider };
