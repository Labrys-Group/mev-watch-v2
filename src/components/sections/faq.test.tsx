import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FAQ_ITEMS } from "@/config/faq";
import { Faq } from "./faq";

describe("Faq", () => {
  it("mentions OFAC as one source of censoring in the censoring explanation", () => {
    render(<Faq />);

    const censoringButton = screen.getByRole("button", {
      name: /What does "OFAC-censoring" mean/i,
    });

    fireEvent.click(censoringButton);

    expect(screen.getByText(/OFAC sanctions are one regime/i)).toBeVisible();
  });

  it("opens both cards in a pair when either button is clicked", () => {
    render(<Faq />);

    const firstButton = screen.getByRole("button", { name: /What is MEV-Boost/i });
    const secondButton = screen.getByRole("button", {
      name: /What does "OFAC-censoring" mean/i,
    });

    // Q1 and Q2 are in the same pair — clicking Q1 opens both
    fireEvent.click(firstButton);

    expect(firstButton).toHaveAttribute("aria-expanded", "true");
    expect(secondButton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(FAQ_ITEMS[0].a)).toBeVisible();

    const secondCard = secondButton.closest("div");
    expect(secondCard).not.toBeNull();
    expect(within(secondCard as HTMLElement).getByText(FAQ_ITEMS[1].a)).toBeVisible();
  });
});
