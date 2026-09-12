import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

const script = readFileSync("modules/pixels/integrations/cirix/pixel-consent.js", "utf8");
function setup(options: { id?: string; blocked?: boolean; saved?: Record<string, unknown> } = {}) {
  class Node {
    className = ""; textContent = ""; innerHTML = ""; hidden = false; disabled = false; type = ""; src = ""; async = false;
    children: Node[] = []; attributes = new Map<string, string>(); handlers = new Map<string, () => void>();
    buttons: Node[] = []; paragraph?: Node;
    appendChild(node: Node) { this.children.push(node); }
    setAttribute(key: string, value: string) { this.attributes.set(key, value); }
    getAttribute(key: string) { return this.attributes.get(key); }
    addEventListener(name: string, handler: () => void) { this.handlers.set(name, handler); }
    focus() {}
    querySelector(selector: string): Node | undefined {
      if (selector === "p") return this.paragraph;
      if (selector === "button") return this.buttons[0];
      return this.buttons.find((button) => selector.includes(`"${button.getAttribute("data-choice")}"`));
    }
    querySelectorAll() { return this.buttons; }
    click() { this.handlers.get("click")?.(); }
  }
  const head = new Node(), body = new Node(), footer = new Node();
  const createElement = vi.fn((name: string) => {
    const node = new Node();
    if (name === "section") {
      node.paragraph = new Node();
      node.buttons = ["reject", "analytics", "all"].map((choice) => { const button = new Node(); button.setAttribute("data-choice", choice); return button; });
    }
    return node;
  });
  const handlers = new Map<string, () => void>();
  const window = { CIRIX_PIXEL_CONFIG: { endpoint: "https://cirixadv.com", siteId: options.id ?? randomUUID() }, cirixPixel: undefined as undefined | { consent: ReturnType<typeof vi.fn> }, addEventListener: (name: string, callback: () => void) => handlers.set(name, callback) };
  const storage = { getItem: vi.fn(() => options.saved ? JSON.stringify(options.saved) : null), setItem: vi.fn() };
  runInNewContext(script, { window, document: { head, body, createElement, querySelector: () => footer, addEventListener() {} }, navigator: { globalPrivacyControl: options.blocked }, localStorage: storage, URL, Element: Node });
  return { window, storage, createElement, head, banner: body.children[0], preferences: footer.children[0], ready: () => handlers.get("cirix:ready")?.() };
}
describe("Cirix consent adapter", () => {
  it("leaves an unconfigured website untouched", () => {
    const result = setup({ id: "" }); expect(result.createElement).not.toHaveBeenCalled(); expect(result.storage.getItem).not.toHaveBeenCalled();
  });
  it("shows a choice without loading the pixel and preserves rejection", () => {
    const result = setup();
    expect(result.banner.hidden).toBe(false); expect(result.head.children).toHaveLength(1);
    result.banner.buttons[0].click();
    expect(result.banner.hidden).toBe(true); expect(result.head.children).toHaveLength(1);
    expect(JSON.parse(result.storage.setItem.mock.calls[0][1])).toMatchObject({ analytics: false, marketing: false });
  });
  it("loads the correct site only after consent and uses the latest choice when ready", () => {
    const result = setup(); result.banner.buttons[1].click();
    expect(result.head.children[1].src).toBe("https://cirixadv.com/pixel.js");
    expect(result.head.children[1].getAttribute("data-site")).toBe(result.window.CIRIX_PIXEL_CONFIG.siteId);
    result.preferences.click(); result.banner.buttons[0].click();
    result.window.cirixPixel = { consent: vi.fn() }; result.ready();
    expect(result.window.cirixPixel.consent).toHaveBeenCalledWith({ analytics: false, marketing: false, version: "1" });
  });
  it("applies advertising separately and allows subsequent withdrawal", () => {
    const result = setup(); result.window.cirixPixel = { consent: vi.fn() };
    result.banner.buttons[2].click();
    expect(result.window.cirixPixel.consent).toHaveBeenLastCalledWith({ analytics: true, marketing: true, version: "1" });
    result.preferences.click(); result.banner.buttons[0].click();
    expect(result.window.cirixPixel.consent).toHaveBeenLastCalledWith({ analytics: false, marketing: false, version: "1" });
  });
  it("does not restore expired consent or override browser privacy preferences", () => {
    const expired = setup({ saved: { analytics: true, marketing: true, version: "1", expires: 1 } });
    expect(expired.banner.hidden).toBe(false); expect(expired.head.children).toHaveLength(1);
    const blocked = setup({ blocked: true, saved: { analytics: true, marketing: true, version: "1", expires: Date.now() + 100000 } });
    expect(blocked.head.children).toHaveLength(1); expect(blocked.banner.buttons[2].disabled).toBe(true);
  });
});
