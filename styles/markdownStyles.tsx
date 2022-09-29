import { Code, useToast } from "@chakra-ui/react";

const markdownStyles = {
  h3: ({ node, ...props }: { node: any }) => (
    <p style={{ margin: "10px 0" }} {...props} />
  ),
  a: ({ node, ...props }: { node: any }) => (
    <a target="_blank" style={{ color: "#00FFA7" }} {...props} />
  ),
  code: ({ node, ...props }: { node: any }) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const toast = useToast();
    return (
      <Code
        p="15px"
        w="100%"
        bgColor="gray.700"
        fontSize="15px"
        color="brightGreen.500"
        // overflowWrap="break-word"
        cursor="pointer"
        mt="5px"
        mb="20px"
        onClick={(e) => {
          navigator.clipboard.writeText((props as any).children[0]);
          toast({
            title: "Copied",
            status: "success",
            duration: 3000,
            isClosable: true,
            position: "top",
          });
        }}
        {...props}
      />
    );
  },
};

export default markdownStyles;
