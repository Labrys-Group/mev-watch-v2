import { chakra, Link, Box, useBreakpointValue } from "@chakra-ui/react";

interface INavLink {
  title: string;
  href: string;
  anchor: boolean;
}

const navLinks: INavLink[] = [
  {
    title: "FAQ",
    href: "#faq",
    anchor: true,
  },
];

const NavBar = () => {
  const scrollTo = (id: string) =>
    document.querySelector(id)!.scrollIntoView({
      behavior: "smooth",
    });

  return (
    <NavContainer display={useBreakpointValue({ base: "none", sm: "block" })}>
      {navLinks.map(({ title, href, anchor }) => (
        <LinkStyled
          key={title}
          onClick={() => anchor && scrollTo(href)}
          href={!anchor ? href : ""}
        >
          {title}
        </LinkStyled>
      ))}
    </NavContainer>
  );
};

const LinkStyled = chakra(Link, {
  baseStyle: {
    color: "white",
    _hover: {
      color: "brightGreen.500",
      textDecoration: "none",
    },
  },
});

const NavContainer = chakra(Box, {
  baseStyle: {
    position: "absolute",
    top: "20px",
    right: "40px",
  },
});

export default NavBar;
