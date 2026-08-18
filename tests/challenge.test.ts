import { describe, expect, it } from "vitest";
import { HumanChallengeBook } from "../src/challenge.js";

describe("human confirmation challenge", () => {
  it("requires exact written confirmation and consumes once", () => {
    const book = new HumanChallengeBook(90_000);
    const challenge = book.issue(
      {
        operation: "maintenance-snapshot",
        amount: "2000",
        network: "eip155:84532",
        payTo: "0x1111111111111111111111111111111111111111",
      },
      0,
    );

    expect(book.confirm(challenge.id, "CONFIRM x402 wrong", 1)).toBe(false);
    expect(book.confirm(challenge.id, `CONFIRM x402 ${challenge.id}`, 1)).toBe(true);
    expect(book.confirm(challenge.id, `CONFIRM x402 ${challenge.id}`, 2)).toBe(false);
  });

  it("rejects an expired confirmation", () => {
    const book = new HumanChallengeBook(90_000);
    const challenge = book.issue(
      {
        operation: "maintenance-snapshot",
        amount: "2000",
        network: "eip155:84532",
        payTo: "0x1111111111111111111111111111111111111111",
      },
      0,
    );
    expect(book.confirm(challenge.id, `CONFIRM x402 ${challenge.id}`, 90_000)).toBe(false);
  });
});
