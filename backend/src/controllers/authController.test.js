import { describe, expect, it } from "vitest";
import { normalizePublicSignupRole } from "./authController.js";

describe("auth controller security", () => {
  it("forces public signup role to student", () => {
    expect(normalizePublicSignupRole("admin")).toBe("student");
    expect(normalizePublicSignupRole("faculty")).toBe("student");
    expect(normalizePublicSignupRole()).toBe("student");
  });
});
