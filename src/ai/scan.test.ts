import { describe, it, expect } from "vitest";
import { scanForSecrets, redact, REDACTION } from "./scan";

const OPENAI = "sk-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0";
const OPENAI_PROJ = "sk-proj-abc123DEF456ghi789JKL012mno345";
const ANTHROPIC = "sk-ant-api03-9f8e7d6c5b4a3928170615243342516";
const AWS = "AKIA2Z7QF3KLMN4PQ5RS";
const GITHUB = "ghp_aB3dE5fG7hJ9kL1mN3pQ5rS7tU9vW1xY3zA5";
const GITHUB_PAT = "github_pat_11AbCdEfGh0iJkLmNoPqRsT";
const JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1gFWFOEjXk";
const MOBILE = "13812345678";
const CN_ID = "11010519491231002X";

function kinds(text: string): string[] {
  return scanForSecrets(text).map((f) => f.kind);
}

describe("detectors", () => {
  it("flags OpenAI keys", () => {
    expect(kinds(`key is ${OPENAI} ok`)).toEqual(["openai-key"]);
    expect(kinds(OPENAI_PROJ)).toEqual(["openai-key"]);
  });

  it("flags Anthropic keys without mistaking them for OpenAI keys", () => {
    expect(kinds(ANTHROPIC)).toEqual(["anthropic-key"]);
  });

  it("flags AWS access key ids", () => {
    expect(kinds(`aws id ${AWS}`)).toEqual(["aws-access-key-id"]);
  });

  it("flags GitHub tokens", () => {
    expect(kinds(GITHUB)).toEqual(["github-token"]);
    expect(kinds(GITHUB_PAT)).toEqual(["github-token"]);
  });

  it("flags PEM private key banners", () => {
    expect(kinds("-----BEGIN RSA PRIVATE KEY-----")).toEqual(["pem-private-key"]);
    expect(kinds("-----BEGIN PRIVATE KEY-----")).toEqual(["pem-private-key"]);
    expect(kinds("-----BEGIN OPENSSH PRIVATE KEY-----")).toEqual(["pem-private-key"]);
    expect(kinds("-----BEGIN PUBLIC KEY-----")).toEqual([]);
  });

  it("flags JWTs", () => {
    expect(kinds(`Authorization: Bearer ${JWT}`)).toEqual(["jwt"]);
  });

  it("flags long tokens assigned to suspicious identifiers", () => {
    expect(kinds("api_key = 3f8a9b2c4d5e6f7a8b9c0d1e2f3a4b5c")).toEqual([
      "assigned-secret",
    ]);
    expect(kinds('apikey: "aB3dE5fG7hJ9kL1mN3pQ5"')).toEqual(["assigned-secret"]);
    expect(kinds("token=Zm9vYmFyYmF6MTIzNDU2Nzg5MA==")).toEqual(["assigned-secret"]);
    expect(kinds("PASSWORD: 4c8d1e9f2a7b3c6d5e0f1a2b3c4d5e6f")).toEqual([
      "assigned-secret",
    ]);
    expect(kinds("private_key = 'aB3dE5fG7hJ9kL1mN3pQ5rS7t'")).toEqual([
      "assigned-secret",
    ]);
    expect(kinds("refresh_token: aB3dE5fG7hJ9kL1mN3pQ5rS7t")).toEqual([
      "assigned-secret",
    ]);
    expect(kinds("passwd=9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d")).toEqual([
      "assigned-secret",
    ]);
  });

  it("flags mainland-China mobile numbers and resident ids", () => {
    expect(kinds(`call ${MOBILE} today`)).toEqual(["cn-mobile"]);
    expect(kinds(`id ${CN_ID} here`)).toEqual(["cn-id"]);
    expect(kinds("id 110105194912310021 here")).toEqual(["cn-id"]);
  });
});

describe("false positives", () => {
  it("leaves ordinary prose alone", () => {
    expect(
      kinds(
        "This section explains how the secret token is stored and why passwords never leave the machine.",
      ),
    ).toEqual([]);
  });

  it("leaves markdown links, hex colours and git SHAs alone", () => {
    expect(kinds("See the [API guide](https://example.com/docs/api) for details.")).toEqual(
      [],
    );
    expect(kinds("background: #1a2b3c;\ncolor: #ffaa00;")).toEqual([]);
    expect(kinds("Fixed in 9f2c1ab8e4d7c6b5a4938271605f4e3d2c1b0a99 upstream.")).toEqual(
      [],
    );
    expect(kinds("border-radius: 4px; --brand: #0f172a;")).toEqual([]);
  });

  it("ignores obvious placeholders", () => {
    expect(kinds("sk-xxxxxxxx")).toEqual([]);
    expect(kinds("sk-...")).toEqual([]);
    expect(kinds("YOUR_API_KEY")).toEqual([]);
    expect(kinds("api_key=<your-key>")).toEqual([]);
    expect(kinds("api_key = YOUR_API_KEY_HERE")).toEqual([]);
    expect(kinds('export OPENAI_API_KEY="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"')).toEqual(
      [],
    );
    expect(kinds("token: 0000000000000000000000000000000000")).toEqual([]);
    expect(kinds("apikey: sk-example-key-1234567890abcdef")).toEqual([]);
  });

  it("does not read a phone number out of a longer digit or hex run", () => {
    expect(kinds("order 1381234567812345678 shipped")).toEqual([]);
    expect(kinds("hash a13812345678b")).toEqual([]);
    expect(kinds("short password: hunter2")).toEqual([]);
  });
});

describe("findings", () => {
  it("orders findings by offset and never reveals more than four characters", () => {
    const text = [
      "# Config",
      `openai: ${OPENAI}`,
      `aws: ${AWS}`,
      `phone: ${MOBILE}`,
    ].join("\n");
    const findings = scanForSecrets(text);
    expect(findings.map((f) => f.kind)).toEqual([
      "openai-key",
      "aws-access-key-id",
      "cn-mobile",
    ]);
    for (let i = 1; i < findings.length; i++) {
      expect(findings[i].start).toBeGreaterThan(findings[i - 1].start);
    }
    for (const finding of findings) {
      expect(finding.excerpt).toHaveLength(5);
      expect(finding.excerpt.endsWith("…")).toBe(true);
      expect(text).toContain(finding.excerpt.slice(0, 4));
      expect(text.slice(finding.start, finding.end)).toContain(finding.excerpt.slice(0, 4));
      expect(text).not.toContain(`${finding.excerpt.slice(0, 4)}…`);
    }
  });

  it("reports 1-based line and column", () => {
    const text = `first\nsecond\nkey ${OPENAI}\n`;
    const findings = scanForSecrets(text);
    expect(findings).toHaveLength(1);
    expect(findings[0].line).toBe(3);
    expect(findings[0].column).toBe(5);
    expect(findings[0].start).toBe(text.indexOf(OPENAI));
    expect(findings[0].end).toBe(text.indexOf(OPENAI) + OPENAI.length);
  });

  it("reports correct columns on CRLF input", () => {
    const text = `first\r\nsecond\r\nkey ${OPENAI}\r\n`;
    const findings = scanForSecrets(text);
    expect(findings).toHaveLength(1);
    expect(findings[0].line).toBe(3);
    expect(findings[0].column).toBe(5);
    expect(findings[0].start).toBe(text.indexOf(OPENAI));
  });

  it("reports the first line as line 1 column 1", () => {
    const findings = scanForSecrets(`${AWS} at the top`);
    expect(findings[0].line).toBe(1);
    expect(findings[0].column).toBe(1);
  });

  it("returns no findings for empty input", () => {
    expect(scanForSecrets("")).toEqual([]);
  });
});

describe("redact", () => {
  it("replaces every finding and keeps the surrounding text", () => {
    const text = `openai=${OPENAI}\nphone ${MOBILE}\nid ${CN_ID}\ntail`;
    const findings = scanForSecrets(text);
    expect(findings).toHaveLength(3);
    const out = redact(text, findings);
    expect(out).toBe(
      `openai=${REDACTION}\nphone ${REDACTION}\nid ${REDACTION}\ntail`,
    );
    expect(out).not.toContain(OPENAI);
    expect(out).not.toContain(MOBILE);
    expect(out).not.toContain(CN_ID);
  });

  it("redacts only the value of an assignment", () => {
    const text = "api_key = 3f8a9b2c4d5e6f7a8b9c0d1e2f3a4b5c";
    expect(redact(text, scanForSecrets(text))).toBe(`api_key = ${REDACTION}`);
  });

  it("produces text that scans clean", () => {
    const text = `${OPENAI}\n${ANTHROPIC}\n${GITHUB}\n${JWT}\n${CN_ID}`;
    const out = redact(text, scanForSecrets(text));
    expect(scanForSecrets(out)).toEqual([]);
  });

  it("is a no-op with no findings", () => {
    expect(redact("nothing to see", [])).toBe("nothing to see");
  });

  it("accepts findings in arbitrary order", () => {
    const text = `${AWS} and ${MOBILE}`;
    const findings = scanForSecrets(text).reverse();
    expect(redact(text, findings)).toBe(`${REDACTION} and ${REDACTION}`);
  });
});
