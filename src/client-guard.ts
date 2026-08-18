import { x402Client } from "@x402/core/client";
import { wrapFetchWithPayment } from "@x402/fetch";
import { ExactEvmScheme, type ClientEvmSigner } from "@x402/evm";
import { ATOMIC_AMOUNT, NETWORK } from "./constants.js";
import { HumanChallengeBook, type PaymentChallenge } from "./challenge.js";
import { evaluatePaymentRequired } from "./policy.js";

export type HumanApproval = (challenge: PaymentChallenge) => Promise<string>;

export function createGuardedFetch(args: {
  signer: ClientEvmSigner;
  payTo: string;
  approve: HumanApproval;
  challengeBook?: HumanChallengeBook;
}): typeof fetch {
  const challengeBook = args.challengeBook ?? new HumanChallengeBook();
  const client = new x402Client().register("eip155:*", new ExactEvmScheme(args.signer));

  client.onBeforePaymentCreation(async ({ paymentRequired }) => {
    const decision = evaluatePaymentRequired(paymentRequired, args.payTo);
    if (!decision.allowed || !decision.accepted) {
      return { abort: true, reason: decision.reasons.join("; ") || "policy blocked" };
    }

    const challenge = challengeBook.issue({
      operation: String(paymentRequired.resource?.url ?? "x402-resource"),
      amount: String(decision.accepted.amount),
      network: String(decision.accepted.network),
      payTo: String(decision.accepted.payTo),
    });
    const writtenConfirmation = await args.approve(challenge);
    if (!challengeBook.confirm(challenge.id, writtenConfirmation)) {
      return { abort: true, reason: "human confirmation missing or expired" };
    }

    if (String(decision.accepted.network) !== NETWORK || String(decision.accepted.amount) !== ATOMIC_AMOUNT) {
      return { abort: true, reason: "request changed after policy evaluation" };
    }
    return undefined;
  });

  return wrapFetchWithPayment(fetch, client);
}
