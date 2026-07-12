/**
 * M7 — SSRF guard tests for the job-posting-by-URL feature.
 * Threat model (BUILD_PROMPT): http(s) only; block private/loopback/link-local/
 * cloud-metadata ranges; DNS-resolve hostnames before allowing the fetch.
 */
import { describe, it, expect } from "vitest";
import { isPrivateIp, assertPublicHost, SsrfBlockedError, htmlToText } from "@/lib/security/ssrf";

describe("isPrivateIp — IPv4 blocked ranges", () => {
  const blocked = [
    "127.0.0.1", // loopback
    "0.0.0.0", // unspecified
    "10.0.0.5", // private A
    "10.255.255.255",
    "172.16.0.1", // private B (low)
    "172.31.255.255", // private B (high)
    "192.168.1.1", // private C
    "169.254.169.254", // AWS/GCP metadata + link-local
    "169.254.0.1",
    "100.64.0.1", // CGNAT
    "224.0.0.1", // multicast
    "255.255.255.255", // reserved
  ];
  for (const ip of blocked) {
    it(`blocks ${ip}`, () => expect(isPrivateIp(ip)).toBe(true));
  }

  const allowed = ["8.8.8.8", "1.1.1.1", "93.184.216.34", "172.15.0.1", "172.32.0.1", "100.63.0.1", "100.128.0.1"];
  for (const ip of allowed) {
    it(`allows public ${ip}`, () => expect(isPrivateIp(ip)).toBe(false));
  }

  it("blocks malformed IPv4 (fail closed)", () => {
    expect(isPrivateIp("999.1.1.1")).toBe(true);
    expect(isPrivateIp("10.0.0")).toBe(true);
  });
});

describe("isPrivateIp — IPv6 blocked ranges", () => {
  it("blocks loopback ::1", () => expect(isPrivateIp("::1")).toBe(true));
  it("blocks unspecified ::", () => expect(isPrivateIp("::")).toBe(true));
  it("blocks link-local fe80::", () => expect(isPrivateIp("fe80::1")).toBe(true));
  it("blocks unique-local fc00::/fd00::", () => {
    expect(isPrivateIp("fc00::1")).toBe(true);
    expect(isPrivateIp("fd12:3456::1")).toBe(true);
  });
  it("blocks v4-mapped metadata address", () => {
    expect(isPrivateIp("::ffff:169.254.169.254")).toBe(true);
  });
  it("allows a public IPv6 address", () => {
    expect(isPrivateIp("2606:4700:4700::1111")).toBe(false);
  });
});

describe("assertPublicHost — protocol + host guards", () => {
  it("rejects non-http(s) schemes", async () => {
    await expect(assertPublicHost(new URL("file:///etc/passwd"))).rejects.toBeInstanceOf(SsrfBlockedError);
    await expect(assertPublicHost(new URL("ftp://example.com"))).rejects.toBeInstanceOf(SsrfBlockedError);
    await expect(assertPublicHost(new URL("gopher://example.com"))).rejects.toBeInstanceOf(SsrfBlockedError);
  });

  it("rejects a literal private IP host without needing DNS", async () => {
    await expect(assertPublicHost(new URL("http://127.0.0.1/"))).rejects.toBeInstanceOf(SsrfBlockedError);
    await expect(assertPublicHost(new URL("http://169.254.169.254/latest/meta-data/"))).rejects.toBeInstanceOf(SsrfBlockedError);
    await expect(assertPublicHost(new URL("http://[::1]/"))).rejects.toBeInstanceOf(SsrfBlockedError);
  });

  it("rejects localhost and internal hostnames without DNS", async () => {
    await expect(assertPublicHost(new URL("http://localhost:8080/"))).rejects.toBeInstanceOf(SsrfBlockedError);
    await expect(assertPublicHost(new URL("http://db.internal/"))).rejects.toBeInstanceOf(SsrfBlockedError);
    await expect(assertPublicHost(new URL("http://printer.local/"))).rejects.toBeInstanceOf(SsrfBlockedError);
  });

  it("allows a literal public IP host", async () => {
    // Returns the vetted address so the connection can be pinned to it
    // (DNS-rebinding TOCTOU defense).
    await expect(assertPublicHost(new URL("http://8.8.8.8/"))).resolves.toEqual({ address: "8.8.8.8", family: 4 });
  });
});

describe("htmlToText — strips scripts before content reaches the LLM", () => {
  it("removes script/style and tags, keeps readable text", () => {
    const html =
      "<html><head><style>.x{color:red}</style></head><body><script>steal()</script><h1>Senior PM</h1><p>Own the roadmap.</p></body></html>";
    const text = htmlToText(html);
    expect(text).toContain("Senior PM");
    expect(text).toContain("Own the roadmap.");
    expect(text).not.toContain("steal()");
    expect(text).not.toContain("<script");
    expect(text).not.toContain("color:red");
  });
});
