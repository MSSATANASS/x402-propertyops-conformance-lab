import { randomUUID } from "node:crypto";

export type PaymentChallenge = {
  id: string;
  operation: string;
  amount: string;
  network: string;
  payTo: string;
  expiresAt: number;
  consumed: boolean;
};

export class HumanChallengeBook {
  private readonly challenges = new Map<string, PaymentChallenge>();

  constructor(private readonly ttlMs = 90_000) {}

  issue(input: Omit<PaymentChallenge, "id" | "expiresAt" | "consumed">, now = Date.now()): PaymentChallenge {
    const challenge: PaymentChallenge = {
      ...input,
      id: `x402-${randomUUID()}`,
      expiresAt: now + this.ttlMs,
      consumed: false,
    };
    this.challenges.set(challenge.id, challenge);
    return challenge;
  }

  confirm(challengeId: string, writtenConfirmation: string, now = Date.now()): boolean {
    const challenge = this.challenges.get(challengeId);
    if (!challenge || challenge.consumed || now >= challenge.expiresAt) return false;
    const expected = `CONFIRM x402 ${challenge.id}`;
    if (writtenConfirmation.trim() !== expected) return false;
    challenge.consumed = true;
    return true;
  }

  get(challengeId: string): PaymentChallenge | undefined {
    return this.challenges.get(challengeId);
  }
}
