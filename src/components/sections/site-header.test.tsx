import { fireEvent, render, screen } from "@testing-library/react";
import type {
  AnchorHTMLAttributes,
  ImgHTMLAttributes,
  ReactNode,
} from "react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { SiteHeader } from "./site-header";

let pathname = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    children: ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/image", () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    priority?: boolean;
  }) => {
    const imgProps = { ...props };
    delete imgProps.fill;
    delete imgProps.priority;
    return createElement("img", imgProps);
  },
}));

vi.mock("@/components/theme-toggle", () => ({
  ThemeToggle: () => <button type="button" aria-label="Toggle theme" />,
}));

describe("SiteHeader", () => {
  it("closes the mobile navigation when the pathname changes", () => {
    const { rerender } = render(<SiteHeader />);

    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));

    expect(
      screen.getByRole("navigation", { name: "Mobile navigation" }),
    ).toBeInTheDocument();

    pathname = "/methodology";
    rerender(<SiteHeader />);

    expect(
      screen.queryByRole("navigation", { name: "Mobile navigation" }),
    ).not.toBeInTheDocument();
  });
});
