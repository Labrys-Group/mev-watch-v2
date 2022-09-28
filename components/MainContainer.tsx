import { ReactNode } from "react";
import { Flex, chakra, Box, VStack, Image, Link, Text } from "@chakra-ui/react";
import { AiTwotoneHeart } from "react-icons/ai";

import { useRouter } from "next/router";

const MainContainer = ({ children }: { children: ReactNode }) => {
  const LABRYS_LINK = "https://labrys.io";

  const router = useRouter();
  return (
    <ImgBackground>
      <Background>
        <BodyContainer>{children}</BodyContainer>
        <Footer>
          <Link color="white" href="/terms-of-use">
            {router.pathname === "/terms-of-use" ? "" : "Terms of Use"}
          </Link>
          <Link href={LABRYS_LINK} target="_blank">
            <VStack align="center">
              <Flex alignItems="center">
                <Text color="#fff" mb="10px" whiteSpace="nowrap">
                  Made with
                </Text>
                <Box mx="10px" mb="7px">
                  <AiTwotoneHeart color="red" size="20px" />
                </Box>
                <Text color="#fff" mb="10px" whiteSpace="nowrap">
                  by Labrys
                </Text>
              </Flex>
              <Image
                src="/LabrysLogo.png"
                alt="Labrys"
                height={50}
                width={70}
              />
            </VStack>
          </Link>
        </Footer>
      </Background>
    </ImgBackground>
  );
};
export default MainContainer;

const ImgBackground = chakra(Flex, {
  baseStyle: {
    backgroundImage: "/gradientBg.png",
    backgroundPosition: "center",
    backgroundSize: "cover",
    width: "100vw",
    minHeight: "100vh",
    minWidth: "600px",
  },
});

const Background = chakra(Flex, {
  baseStyle: {
    flexDirection: "column",
    margin: "0 auto",
    backgroundColor: "#0000007e",
    minHeight: "100vh",
    width: "100%",
  },
});

const BodyContainer = chakra(Flex, {
  baseStyle: {
    minWidth: "600px",
    maxWidth: "1000px",
    width: "100%",
    minHeight: "calc(100vh - 200px)",
    flexDirection: "column",
    margin: "0 auto",
    alignItems: "center",
    paddingTop: "40px",
    paddingX: "20px",
  },
});

const Footer = chakra(VStack, {
  baseStyle: {
    paddingY: "30px",
  },
});
