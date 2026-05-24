import { describe, it, expect, vi, afterEach } from "vitest";
import { sendSlackAlert } from "./slack";

const original = process.env.SLACK_WEBHOOK_URL;
afterEach(() => {
  process.env.SLACK_WEBHOOK_URL = original;
  vi.restoreAllMocks();
});

describe("sendSlackAlert", () => {
  it("posts to the webhook when configured", async () => {
    process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.example/abc";
    const fetchMock = vi.fn(
      async (_input: string | URL | Request, _init?: RequestInit) =>
        new Response("ok", { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await sendSlackAlert("something broke");

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe("https://hooks.slack.example/abc");
  });

  it("is a no-op when the webhook is not configured", async () => {
    delete process.env.SLACK_WEBHOOK_URL;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await sendSlackAlert("something broke");

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("never throws even if the webhook request fails", async () => {
    process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.example/abc";
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("network down");
    }));

    await expect(sendSlackAlert("something broke")).resolves.toBeUndefined();
  });
});
