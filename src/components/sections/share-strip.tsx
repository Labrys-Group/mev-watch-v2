"use client";

import { useState } from "react";
import Link from "next/link";

const TWEET_TEXT = encodeURIComponent(
  "Protocol-level censorship is bad. Keep Ethereum credibly neutral — switch to non-censoring MEV-Boost relays.",
);
const TWEET_URL = encodeURIComponent("https://mevwatch.info");

const ITEM_CLASS =
  "flex-1 py-3.5 px-3 font-mono text-[11px] tracking-[0.12em] uppercase text-fg-muted text-center transition-all duration-200 hover:bg-accent-brand hover:text-foreground hover:tracking-[0.16em] active:translate-y-px focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-brand focus-visible:ring-inset";

export function ShareStrip() {
  const [copyLinkLabel, setCopyLinkLabel] = useState<"Copy link" | "Copied!">(
    "Copy link",
  );
  const [citeLabel, setCiteLabel] = useState<"Cite" | "Copied!">("Cite");

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopyLinkLabel("Copied!");
      setTimeout(() => setCopyLinkLabel("Copy link"), 1500);
    });
  }

  function handleCite() {
    const citation = `MEV Watch — mevwatch.info (accessed ${new Date().toISOString().slice(0, 10)})`;
    navigator.clipboard.writeText(citation).then(() => {
      setCiteLabel("Copied!");
      setTimeout(() => setCiteLabel("Cite"), 1500);
    });
  }

  return (
    <div className="mt-8 grid grid-cols-2 border border-border-labrys sm:flex">
      <a
        href={`https://twitter.com/intent/tweet?text=${TWEET_TEXT}&url=${TWEET_URL}`}
        target="_blank"
        rel="noopener noreferrer"
        className={`${ITEM_CLASS} border-r border-b border-border-labrys sm:border-b-0`}
      >
        Share on X
      </a>
      <button
        type="button"
        onClick={handleCopyLink}
        className={`${ITEM_CLASS} border-b border-border-labrys sm:border-r sm:border-b-0`}
      >
        {copyLinkLabel}
      </button>
      <Link
        href="/embed"
        className={`${ITEM_CLASS} border-r border-border-labrys`}
      >
        Embed
      </Link>
      <button type="button" onClick={handleCite} className={ITEM_CLASS}>
        {citeLabel}
      </button>
    </div>
  );
}
