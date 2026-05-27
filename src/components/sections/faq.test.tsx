import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FAQ_ITEMS } from "@/config/faq";
import { Faq } from "./faq";

describe("Faq", () => {
  it("opens only the clicked card and leaves its row neighbor collapsed", () => {
    render(<Faq />);

    const firstButton = screen.getByRole("button", { name: /What is MEV-Boost/i });
    const secondButton = screen.getByRole("button", {
      name: /What does "censoring" mean/i,
    });

    fireEvent.click(firstButton);

    expect(firstButton).toHaveAttribute("aria-expanded", "true");
    expect(secondButton).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText(FAQ_ITEMS[0].a)).toBeVisible();

    const secondCard = secondButton.closest("div");
    expect(secondCard).not.toBeNull();
    expect(within(secondCard as HTMLElement).queryByText(FAQ_ITEMS[1].a)).toBeNull();
  });
});
