import { HStack, Box, Text, chakra } from "@chakra-ui/react";

interface BlockLabelProps {
  color: string;
  label: string;
}
const BlockLabel = (props: BlockLabelProps) => {
  const { color, label } = props;
  return (
    <HStack>
      <Label bg={color} />
      <Text color="white" fontSize="0.8rem">
        {label}
      </Text>
    </HStack>
  );
};

export default BlockLabel;

const Label = chakra(Box, {
  baseStyle: {
    minHeight: "13px",
    minWidth: "40px",
  },
});
