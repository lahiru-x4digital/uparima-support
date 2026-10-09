import { AxiosError, type AxiosResponse } from "axios";
import { describe, expect, it } from "vitest";
import {
  describeAuthFailure,
  formatCountdown,
  loginPath,
  safeNextPath,
  sanitizeCode,
  signInNotice,
  validateSignIn,
} from "./auth-flow";
import { decodeUser } from "./auth-user";

/** A refusal shaped like the backend's: `{ success: false, error: { code, message } }`. */
const refusal = (status: number, code: string, message: string) =>
  new AxiosError(message, "ERR_BAD_REQUEST", undefined, undefined, {
    status,
    data: { success: false, error: { code, message } },
  } as AxiosResponse);

describe("validateSignIn", () => {
  it("accepts a real email and a password of 8+ characters", () => {
    expect(validateSignIn({ email: "agent@uparima.lk", password: "Passw0rd!" })).toEqual({});
  });

  it("says what to fix, one message per field", () => {
    expect(validateSignIn({ email: "", password: "" })).toEqual({
      email: "Enter your email address",
      password: "Enter your password",
    });
    expect(validateSignIn({ email: "agent@", password: "short" })).toEqual({
      email: "Enter a valid email address",
      password: "Passwords are at least 8 characters",
    });
  });
});

describe("sanitizeCode", () => {
  it("keeps the digits of whatever was pasted", () => {
    expect(sanitizeCode("123 456")).toBe("123456");
    expect(sanitizeCode("Your code: 987-654.")).toBe("987654");
    expect(sanitizeCode("12ab")).toBe("12");
  });

  it("never grows past six digits", () => {
    expect(sanitizeCode("1234567890")).toBe("123456");
  });
});

describe("safeNextPath", () => {
  it("returns to a page inside the portal", () => {
    expect(safeNextPath("/drivers/42?tab=rides")).toBe("/drivers/42?tab=rides");
  });

  it("falls back to the inbox for anything else", () => {
    for (const bad of [undefined, null, "", "inbox", "https://evil.example", "//evil.example", "/\\evil.example", "/a\nb", 7]) {
      expect(safeNextPath(bad)).toBe("/inbox");
    }
  });

  it("never sends a signed-in agent back to the sign-in page", () => {
    expect(safeNextPath("/login")).toBe("/inbox");
    expect(safeNextPath("/login?next=/login")).toBe("/inbox");
  });
});

describe("loginPath", () => {
  it("is plain when there is nothing to remember", () => {
    expect(loginPath()).toBe("/login");
    expect(loginPath(undefined, "/inbox")).toBe("/login");
  });

  it("carries the reason and the page to come back to", () => {
    expect(loginPath("expired", "/drivers/42?tab=rides")).toBe("/login?reason=expired&next=%2Fdrivers%2F42%3Ftab%3Drides");
    expect(loginPath("two-factor-on")).toBe("/login?reason=two-factor-on");
  });

  it("drops a return address outside the portal", () => {
    expect(loginPath("expired", "//evil.example")).toBe("/login?reason=expired");
  });
});

describe("signInNotice", () => {
  it("explains a known reason and ignores anything else in the address bar", () => {
    expect(signInNotice("expired")).toMatch(/session ended/);
    expect(signInNotice("two-factor-on")).toMatch(/email you a code/);
    expect(signInNotice("<script>")).toBeNull();
    expect(signInNotice(undefined)).toBeNull();
  });
});

describe("describeAuthFailure", () => {
  it("does not say which of email or password was wrong", () => {
    const failure = describeAuthFailure(refusal(401, "INVALID_CREDENTIALS", "Invalid email or password"));
    expect(failure).toEqual({ message: "That email and password don't match. Check them and try again.", action: "retry" });
  });

  it("explains a locked and a deactivated account", () => {
    expect(describeAuthFailure(refusal(401, "ACCOUNT_LOCKED", "Account is locked. Try again later")).message).toMatch(/locked/);
    expect(describeAuthFailure(refusal(403, "ACCOUNT_INACTIVE", "Account is deactivated")).message).toMatch(/deactivated/);
  });

  it("lets a wrong code be retried, with the attempts left", () => {
    const failure = describeAuthFailure(refusal(401, "TWO_FACTOR_INVALID", "Incorrect code — 3 attempt(s) left"));
    expect(failure).toEqual({ message: "Incorrect code — 3 attempt(s) left", action: "retry" });
    // The same refusal from the signed-in "turn it on" flow arrives as a 400.
    expect(describeAuthFailure(refusal(400, "TWO_FACTOR_INVALID", "Incorrect code — 3 attempt(s) left")).action).toBe("retry");
  });

  it("starts over when the code is used up or expired", () => {
    expect(describeAuthFailure(refusal(429, "TWO_FACTOR_INVALID", "Too many wrong codes — please sign in again")).action).toBe("restart");
    expect(describeAuthFailure(refusal(401, "OTP_EXPIRED", "This code has expired — please sign in again")).action).toBe("restart");
  });

  it("passes on a rate limit as it was worded", () => {
    const failure = describeAuthFailure(refusal(429, "RATE_LIMITED", "Please wait 42s before requesting a new code"));
    expect(failure).toEqual({ message: "Please wait 42s before requesting a new code", action: "retry" });
  });

  it("tells a dead connection apart from a refusal", () => {
    expect(describeAuthFailure(new AxiosError("Network Error", "ERR_NETWORK")).message).toMatch(/Can't reach the server/);
    expect(describeAuthFailure(new Error("This account doesn't have access to the Support Portal.")).message).toMatch(/doesn't have access/);
  });
});

describe("formatCountdown", () => {
  it("shows minutes and seconds", () => {
    expect(formatCountdown(600)).toBe("10:00");
    expect(formatCountdown(59.2)).toBe("1:00");
    expect(formatCountdown(7)).toBe("0:07");
    expect(formatCountdown(-3)).toBe("0:00");
  });
});

describe("decodeUser", () => {
  const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const token = (claims: object) => `${b64({ alg: "none" })}.${b64({ sub: "9", exp: Math.floor(Date.now() / 1000) + 600, ...claims })}.sig`;

  it("lets staff in", () => {
    expect(decodeUser(token({ type: "support", mfa: true }))).toEqual({ id: 9, type: "support" });
    expect(decodeUser(token({ type: "admin", mfa: true }))).toEqual({ id: 9, type: "admin" });
  });

  it("refuses customers, expired tokens and admin tokens without the sign-in claim", () => {
    expect(decodeUser(token({ type: "user" }))).toBeNull();
    expect(decodeUser(token({ type: "admin" }))).toBeNull();
    expect(decodeUser(token({ type: "support", exp: 1 }))).toBeNull();
    expect(decodeUser("not-a-token")).toBeNull();
    expect(decodeUser(null)).toBeNull();
  });
});
