import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { CommercialContactDto, CrmDashboardDto } from "@/modules/zoho/crm/application/dtos/crm-dashboard-dto";

const state = vi.hoisted(() => ({ get: vi.fn(), locale: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/modules/zoho/server/dashboard", () => ({ getZohoDashboardState: state.get }));
vi.mock("@/lib/i18n", () => ({ getCurrentLocale: state.locale }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));

import ContactPage from "@/app/zoho/[stage]/[id]/page";
import { CrmContactDetail } from "@/modules/zoho/ui/crm-contact-detail";
import { CrmStagePage } from "@/modules/zoho/ui/crm-module-pages";
import { ZohoCrmReadModel } from "@/modules/zoho/crm/infrastructure/adapters/zoho-crm-read-model";
import type { ZohoCrmClient } from "@/modules/zoho/crm/infrastructure/adapters/zoho-crm-client";

const contact: CommercialContactDto = {
  id: "lead:123", externalCrmId: "123", externalModule: "lead", fullName: "Ana Pérez", phone: "+584121234567",
  email: "ana@example.com", companyName: "Acme", source: "Web", owner: "Sales", lifecycleStage: "lead",
  qualificationStatus: "new", subscriptionStatus: null, interestCategory: null, nextAction: "Llamar mañana",
  description: "Primera línea.\n" + "Contexto completo del contacto. ".repeat(10),
  lastActivityAt: null, convertedAt: null, createdAt: "2026-09-12T12:00:00Z", updatedAt: "2026-09-12T12:00:00Z",
};
const dashboard: CrmDashboardDto = {
  contacts: [contact], stageSummary: [], conversions: [], priorityFollowUps: [],
  activities: [
    { id: "a1", contactId: contact.id, kind: "note", summary: "Nota de Ana", happenedAt: contact.createdAt },
    { id: "a2", contactId: "lead:999", kind: "note", summary: "Otro contacto", happenedAt: contact.createdAt },
  ],
  opportunities: [
    { id: "d1", externalCrmId: "d1", contactId: contact.id, title: "Proyecto Ana", stage: "Open", value: 0, expectedCloseDate: null, owner: "Sales", status: "open" },
    { id: "d2", externalCrmId: "d2", contactId: "lead:999", title: "Otro negocio", stage: "Open", value: null, expectedCloseDate: null, owner: "Sales", status: "open" },
  ],
};
beforeEach(() => {
  state.get.mockReset().mockResolvedValue({ dashboard, warning: null });
  state.locale.mockReset().mockResolvedValue("es");
});
const page = (stage: string, id: string) => ContactPage({ params: Promise.resolve({ stage, id }) });

describe("CRM contact detail navigation", () => {
  it.each(["es", "en"] as const)("links the lead row to its localized detail in %s", (locale) => {
    const html = renderToStaticMarkup(createElement(CrmStagePage, { locale, dashboard, stage: "lead" }));
    expect(html).toContain(`href="/${locale}/zoho/leads/lead%3A123"`);
    expect(html).toContain(locale === "es" ? "1 registro" : "1 record");
  });
  it("loads only the selected contact's activities and deals", async () => {
    const result = await page("leads", contact.id);
    expect(result.props.contact.id).toBe(contact.id);
    expect(result.props.activities.map((item: { id: string }) => item.id)).toEqual(["a1"]);
    expect(result.props.opportunities.map((item: { id: string }) => item.id)).toEqual(["d1"]);
  });
  it.each(["es", "en"])("resolves an encoded lead ID from a real %s URL", async (locale) => {
    state.locale.mockResolvedValue(locale);
    const id = "lead:7371235000000804002";
    state.get.mockResolvedValue({ dashboard: { ...dashboard, contacts: [{ ...contact, id }] }, warning: null });
    const result = await page("leads", encodeURIComponent(id));
    expect(result.props.contact.id).toBe(id);
    expect(result.props.locale).toBe(locale);
  });
  it("rejects malformed URL encoding without requesting CRM data", async () => {
    await expect(page("leads", "lead%ZZ123")).rejects.toThrow("NOT_FOUND");
    expect(state.get).not.toHaveBeenCalled();
  });
  it.each([["leads", "missing"], ["customers", contact.id], ["invalid", contact.id]])("returns not found for %s/%s", async (stage, id) => {
    await expect(page(stage, id)).rejects.toThrow("NOT_FOUND");
  });
  it("does not mistake a temporarily unavailable CRM for a missing record", async () => {
    state.get.mockResolvedValue({ dashboard: { ...dashboard, contacts: [] }, warning: "CRM temporarily paused after rate limiting" });
    await expect(page("leads", contact.id)).rejects.toThrow("CRM temporarily paused");
  });
  it.each(["es", "en"] as const)("renders the complete description and return link in %s", (locale) => {
    const html = renderToStaticMarkup(createElement(CrmContactDetail, { locale, contact, activities: [], opportunities: [] }));
    expect(html).toContain(contact.description);
    expect(html).toContain(`href="/${locale}/zoho/leads"`);
    expect(html).toContain("mailto:ana@example.com");
    expect(html).toContain("tel:+584121234567");
    expect(html).toContain(locale === "es" ? "No hay actividad reciente" : "No recent activity");
  });
  it("preserves the full Zoho description while retaining the short list summary", async () => {
    const client = { listModule: vi.fn(async (module: string) => module === "Leads" ? [{ id: "123", Full_Name: "Ana Pérez", Description: contact.description, Created_Time: contact.createdAt }] : []) };
    const contacts = await new ZohoCrmReadModel(client as unknown as ZohoCrmClient).listCommercialContacts();
    expect(contacts[0].description).toBe(contact.description!.trim());
    expect(contacts[0].nextAction!.length).toBeLessThanOrEqual(90);
  });
});
