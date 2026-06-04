import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SiteFooter } from "./site-footer";

describe("SiteFooter", () => {
  it("includes icon links for Labrys social destinations", () => {
    render(<SiteFooter />);

    expect(screen.getByRole("link", { name: "GitHub" })).toHaveAttribute(
      "href",
      "https://github.com/Labrys-Group/mev-watch-v2",
    );
    expect(screen.getByRole("link", { name: "X (Twitter)" })).toHaveAttribute(
      "href",
      "https://x.com/labrys_io",
    );
    expect(screen.getByRole("link", { name: "LinkedIn" })).toHaveAttribute(
      "href",
      "https://www.linkedin.com/company/labrys-io",
    );
    expect(screen.getByRole("link", { name: "Facebook" })).toHaveAttribute(
      "href",
      "https://www.facebook.com/labrys.io",
    );
    expect(screen.getByRole("link", { name: "Instagram" })).toHaveAttribute(
      "href",
      "https://www.instagram.com/labrys.io/?hl=en",
    );
  });
});
