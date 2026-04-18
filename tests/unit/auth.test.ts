import { describe, it, expect } from "vitest";
import bcrypt from "bcryptjs";

describe("auth - password hashing", () => {
  it("hashes and verifies password correctly", async () => {
    const password = "password123";
    const hash = await bcrypt.hash(password, 10);

    expect(await bcrypt.compare(password, hash)).toBe(true);
    expect(await bcrypt.compare("wrong", hash)).toBe(false);
  });

  it("generates different hashes for same password", async () => {
    const hash1 = await bcrypt.hash("test", 10);
    const hash2 = await bcrypt.hash("test", 10);
    expect(hash1).not.toBe(hash2);
  });
});
