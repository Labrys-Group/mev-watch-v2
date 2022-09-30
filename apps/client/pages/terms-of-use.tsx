import { OrderedList, chakra, IconButton, Box } from "@chakra-ui/react";
import { useRouter } from "next/router";
import { IoIosArrowBack } from "react-icons/io";
import { Title, StyledListItem, DefaultText } from "../styles/StyledComponents";

const Disclaimer = () => {
  const router = useRouter();

  return (
    <Box position="relative">
      <BackBtn
        aria-label="Back"
        icon={<IoIosArrowBack size="2rem" />}
        onClick={() => router.push("/")}
      />
      <Title fontSize="3rem" fontWeight="bold" textAlign="center">
        Disclaimer
      </Title>
      <DefaultText>
        The information provided on this website does not, and is not intended
        to, constitute legal or financial advice. All information, content, and
        materials available on this site are for general informational purposes
        only. To the fullest extent permitted by law, Labrys Group Pty Ltd
        (‘Labrys’) makes no representation or warranty, express or implied, in
        connection with the site and your (‘User’) use thereof, including,
        without limitation, the implied warranties of merchantability, fitness
        for a particular purpose, and non-infringement. In no event will Labrys,
        its directors, employees, or agents be liable to you or any third party
        for any direct, indirect, consequential, exemplary, incidental, special,
        or punitive damages including, but not limited to, lost profit, lost
        revenue, loss of data, or other damages arising from your use of the
        site.
      </DefaultText>
      <DefaultText>
        Labrys makes no warranties or representations about the accuracy or
        completeness of the site’s content, or the content of any websites
        linked. Labrys issues no liability or responsibility for any:
      </DefaultText>
      <OrderedList>
        <StyledListItem>
          Errors, mistakes, or inaccuracies of content and materials, or
        </StyledListItem>

        <StyledListItem>
          Unauthorised access to or use of our secure servers and any personal
          information, including financial information, stored therein, or
        </StyledListItem>
        <StyledListItem>
          Interruption or cessation of transmission to or from the site, and
        </StyledListItem>
        <StyledListItem>
          Bugs, viruses, Trojan horses, or the like which may be transmitted to
          or through the site by a third-party.
        </StyledListItem>
      </OrderedList>
      <DefaultText>
        Your use of the site is solely at your own risk. This website contains
        links to third-party websites. Such links are only for the convenience
        of the user. Labrys does not warrant, endorse, or assume liability for
        the contents of these third-party sites. Labrys will not be a party to,
        or in any way be responsible, for monitoring any transaction between you
        and any third-party providers of products or services. As with the
        purchase or use of a product or service through any medium or in any
        environment, you should use your best judgment and exercise caution
        where appropriate.
      </DefaultText>
    </Box>
  );
};

export default Disclaimer;

const BackBtn = chakra(IconButton, {
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
