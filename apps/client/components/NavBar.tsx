import { chakra, Link, Box } from "@chakra-ui/react";

interface INavLink {
  title: string;
  href: string;
}

const navLinks: INavLink[] = [
  {
    title: "FAQ",
    href: "#faq",
  },
];

const NavBar = () => {
  const scrollTo = (id: string) =>
    document.querySelector(id)!.scrollIntoView({
      behavior: "smooth",
    });

  return (
    <NavContainer>
      {navLinks.map(({ title, href }) => (
        <LinkStyled onClick={() => scrollTo(href)}>{title}</LinkStyled>
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
