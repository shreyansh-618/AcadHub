import { findMongoInjectionPath } from "../utils/security.js";

export const rejectMongoOperators = (req, res, next) => {
  const payloads = [
    ["body", req.body],
    ["query", req.query],
    ["params", req.params],
  ];

  for (const [name, payload] of payloads) {
    const unsafePath = findMongoInjectionPath(payload, name);
    if (unsafePath) {
      return res.status(400).json({
        code: "INVALID_INPUT",
        message: "Request contains unsupported query operators",
      });
    }
  }

  return next();
};

export default {
  rejectMongoOperators,
};
