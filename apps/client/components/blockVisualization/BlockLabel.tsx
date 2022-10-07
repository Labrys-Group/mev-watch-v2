import { HStack, Box, Text } from "@chakra-ui/react";

interface BlockLabelProps {
  color: string;
  label: string;
}
const BlockLabel = (props: BlockLabelProps) => {
  const { color, label } = props;
  return (
    <HStack pr="30px">
      <Box bg={color} h="25px" w="25px" mr="5px" borderRadius="5px" />
      <Text color="white" fontSize="0.8rem">
        {label}
      </Text>
    </HStack>
  );
};

export default BlockLabel;
