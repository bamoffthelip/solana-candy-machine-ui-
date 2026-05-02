import crypto from "crypto";
import { MpcSession } from "../types/phase3";

function nowIso(): string {
  return new Date().toISOString();
}

export function createMpcSession(walletAddress: string): MpcSession {
  return {
    id: crypto.randomUUID(),
    walletAddress,
    state: "created",
    createdAt: nowIso(),
  };
}

export function bindMpcDevice(session: MpcSession, deviceId: string): MpcSession {
  return {
    ...session,
    deviceId,
    state: "device-bound",
  };
}

export function issueMpcChallenge(session: MpcSession): MpcSession {
  return {
    ...session,
    challengeNonce: crypto.randomBytes(16).toString("hex"),
    state: "challenge-issued",
  };
}

export function verifyMpcChallenge(session: MpcSession, responseNonce: string): MpcSession {
  const valid = Boolean(session.challengeNonce) && responseNonce === session.challengeNonce;
  if (!valid) {
    throw new Error("Invalid MPC challenge response.");
  }

  return {
    ...session,
    state: "verified",
  };
}
