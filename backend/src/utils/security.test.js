import { describe, expect, it } from "vitest";
import { findMongoInjectionPath, normalizeString } from "./security.js";

describe("security utilities", () => {
  it("detects nested MongoDB operator keys", () => {
    expect(
      findMongoInjectionPath({
        email: { $ne: null },
      }),
    ).toBe("payload.email.$ne");
  });

  it("detects dotted MongoDB path keys", () => {
    expect(
      findMongoInjectionPath({
        profile: {
          "role.admin": true,
        },
      }),
    ).toBe("payload.profile.role.admin");
  });

  it("allows ordinary nested request payloads", () => {
    expect(
      findMongoInjectionPath({
        filters: {
          department: "Computer Science",
          semester: 4,
        },
        resourceIds: ["665f1f77bcf86cd799439011"],
      }),
    ).toBeNull();
  });

  it("removes control characters from user strings", () => {
    expect(normalizeString(" Hello\u0000\tWorld\r\n\n\nAgain ")).toBe(
      "Hello World\n\nAgain",
    );
  });
});
