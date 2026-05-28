import { describe, expect, it } from "vitest";
import * as statusPage from "./page";

describe("status page route config", () => {
  it("renders dynamically on the Node runtime so it reads the current SQLite artifact", () => {
    expect(statusPage.runtime).toBe("nodejs");
    expect(statusPage.dynamic).toBe("force-dynamic");
  });

  it("uses a short route metadata title", () => {
    expect(statusPage.metadata.title).toBe("Status");
  });
});
