import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const clientRoots = ["frontend", "mobile-app"];
const forbiddenClientEnvNames = [
  /OPENAI/i,
  /GEMINI/i,
  /ANTHROPIC/i,
  /JWT/i,
  /MONGO/i,
  /DATABASE/i,
  /PRIVATE/i,
  /SECRET/i,
  /ADMIN/i,
  /SERVICE_ACCOUNT/i,
  /AWS_SECRET/i,
];
const forbiddenSourcePatterns = [
  /\bsk-[A-Za-z0-9_-]{20,}/,
  /\bGEMINI_API_KEY\b/,
  /\bOPENAI_API_KEY\b/,
  /\bFIREBASE_PRIVATE_KEY\b/,
  /\bmongodb\+srv:\/\//i,
];
const allowedExtensions = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".json",
  ".html",
  ".css",
  ".env",
  ".example",
]);
const ignoredDirs = new Set(["node_modules", "dist", "build", ".expo", ".git"]);

const walk = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (ignoredDirs.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
    } else if (
      entry.name.startsWith(".env") ||
      allowedExtensions.has(path.extname(entry.name))
    ) {
      files.push(fullPath);
    }
  }

  return files;
};

describe("client secret exposure", () => {
  it("does not define private env vars in frontend or mobile env files", () => {
    const violations = [];

    for (const root of clientRoots) {
      const rootPath = path.join(repoRoot, root);
      for (const file of fs.readdirSync(rootPath)) {
        if (!file.startsWith(".env")) continue;

        const content = fs.readFileSync(path.join(rootPath, file), "utf8");
        for (const line of content.split(/\r?\n/)) {
          const match = line.match(/^\s*([^#=\s]+)\s*=/);
          if (!match) continue;

          const name = match[1];
          if (forbiddenClientEnvNames.some((pattern) => pattern.test(name))) {
            violations.push(`${root}/${file}:${name}`);
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("does not hard-code AI, database, or admin secrets in client source", () => {
    const violations = [];

    for (const root of clientRoots) {
      for (const filePath of walk(path.join(repoRoot, root))) {
        const relativePath = path.relative(repoRoot, filePath);
        const content = fs.readFileSync(filePath, "utf8");

        for (const pattern of forbiddenSourcePatterns) {
          if (pattern.test(content)) {
            violations.push(`${relativePath}:${pattern}`);
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("does not persist web auth bearer tokens in localStorage", () => {
    const frontendFiles = walk(path.join(repoRoot, "frontend"));
    const violations = [];

    for (const filePath of frontendFiles) {
      const relativePath = path.relative(repoRoot, filePath);
      const content = fs.readFileSync(filePath, "utf8");

      if (
        /localStorage\.(setItem|getItem|removeItem)\(\s*["']authToken["']/.test(
          content,
        )
      ) {
        violations.push(relativePath);
      }
    }

    expect(violations).toEqual([]);
  });

  it("does not expose admin self-selection in public signup UI", () => {
    const signupPath = path.join(repoRoot, "frontend", "src", "pages", "Signup.jsx");
    const content = fs.readFileSync(signupPath, "utf8");

    expect(content).not.toMatch(/<option[^>]+value=["']admin["']/i);
  });
});
