import { describe, expect, it, vi } from "vitest";
import { rejectMongoOperators } from "./requestSecurity.js";

const runMiddleware = (req) => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  const next = vi.fn();

  rejectMongoOperators(req, res, next);

  return { res, next };
};

describe("request security middleware", () => {
  it("rejects NoSQL operator injection in JSON bodies", () => {
    const { res, next } = runMiddleware({
      body: { email: { $ne: null } },
      query: {},
      params: {},
    });

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      code: "INVALID_INPUT",
      message: "Request contains unsupported query operators",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("passes safe requests to the next handler", () => {
    const { res, next } = runMiddleware({
      body: { email: "student@example.com" },
      query: { page: "1" },
      params: { id: "665f1f77bcf86cd799439011" },
    });

    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });
});
