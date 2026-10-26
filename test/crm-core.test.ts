import { beforeEach, describe, expect, it } from "vitest";
import { Customer } from "@/modules/crm/domain/entities/customer";
import { CustomerEvent } from "@/modules/crm/domain/entities/customer-event";
import { GetCustomerTimeline } from "@/modules/crm/application/use-cases/get-customer-timeline";
import { ListCustomers } from "@/modules/crm/application/use-cases/list-customers";
import { ListMyCustomerBusinesses } from "@/modules/crm/application/use-cases/list-my-customer-businesses";
import { RecordCustomerEvent } from "@/modules/crm/application/use-cases/record-customer-event";
import { RegisterCustomer } from "@/modules/crm/application/use-cases/register-customer";
import {
  InMemoryCustomerEventRepository,
  InMemoryCustomerRepository,
} from "@/modules/crm/infrastructure/persistence/in-memory-crm-repositories";

let customers: InMemoryCustomerRepository;
let events: InMemoryCustomerEventRepository;

beforeEach(() => {
  customers = new InMemoryCustomerRepository();
  events = new InMemoryCustomerEventRepository();
});

const register = (overrides: Partial<Parameters<RegisterCustomer["execute"]>[0]> = {}) =>
  new RegisterCustomer(customers, events).execute({
    businessId: "biz-a",
    userId: "user-1",
    email: "Ana@Example.com",
    name: "  Ana   Pérez ",
    phone: "(239) 555-0100",
    source: "table_qr",
    ...overrides,
  });

describe("customer", () => {
  it("normalizes name, email and phone", () => {
    const result = Customer.create({
      businessId: "biz-a",
      userId: "u1",
      email: " Ana@Example.COM ",
      name: "  Ana   Pérez ",
      phone: "+1 (239) 555-0100",
      source: "web",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.name).toBe("Ana Pérez");
    expect(result.value.email).toBe("ana@example.com");
    expect(result.value.phone).toBe("+12395550100");
  });

  it("treats a missing phone as optional", () => {
    const withNull = Customer.create({ businessId: "b", userId: "u", email: "a@b.co", name: "Ana", phone: null, source: "web" });
    const withBlank = Customer.create({ businessId: "b", userId: "u", email: "a@b.co", name: "Ana", phone: "   ", source: "web" });
    expect(withNull.ok && withNull.value.phone).toBeNull();
    expect(withBlank.ok && withBlank.value.phone).toBeNull();
  });

  it.each([
    ["a name that is too short", { name: "A" }],
    ["a name that is too long", { name: "x".repeat(101) }],
    ["an invalid email", { email: "nope" }],
    ["a phone with letters", { phone: "555-CALL-NOW" }],
    ["a phone that is too short", { phone: "12345" }],
    ["a phone that is too long", { phone: "1".repeat(16) }],
    ["an unknown source", { source: "billboard" }],
    ["an empty business", { businessId: "  " }],
    ["an empty user", { userId: "" }],
  ])("rejects %s", (_label, overrides) => {
    const result = Customer.create({
      businessId: "b",
      userId: "u",
      email: "a@b.co",
      name: "Ana",
      phone: null,
      source: "web",
      ...overrides,
    });
    expect(result.ok).toBe(false);
  });
});

describe("registering a customer", () => {
  it("creates the customer and records a registration event", async () => {
    const result = await register();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.created).toBe(true);
    expect(result.value.customer.name).toBe("Ana Pérez");

    const timeline = await new GetCustomerTimeline(customers, events).execute({ businessId: "biz-a", userId: "user-1" });
    expect(timeline.ok && timeline.value.events.map((event) => event.type)).toEqual(["registered"]);
    expect(timeline.ok && timeline.value.events[0].data).toEqual({ source: "table_qr" });
  });

  it("is idempotent: registering twice keeps one customer and one event", async () => {
    await register();
    const again = await register({ name: "Different Name" });
    expect(again.ok && again.value.created).toBe(false);
    // The original record wins; a repeat scan never rewrites the person.
    expect(again.ok && again.value.customer.name).toBe("Ana Pérez");

    const timeline = await new GetCustomerTimeline(customers, events).execute({ businessId: "biz-a", userId: "user-1" });
    expect(timeline.ok && timeline.value.events).toHaveLength(1);
  });

  it("survives concurrent registrations without duplicating anything", async () => {
    const results = await Promise.all([register(), register(), register()]);
    expect(results.filter((result) => result.ok && result.value.created)).toHaveLength(1);
    const timeline = await new GetCustomerTimeline(customers, events).execute({ businessId: "biz-a", userId: "user-1" });
    expect(timeline.ok && timeline.value.events).toHaveLength(1);
  });

  it("rejects invalid input without writing", async () => {
    const result = await register({ email: "broken" });
    expect(result.ok).toBe(false);
    expect(await customers.find("biz-a", "user-1")).toBeNull();
  });
});

describe("tenant isolation", () => {
  it("makes one person a separate customer in each business", async () => {
    await register({ businessId: "biz-a", name: "Ana en A" });
    await register({ businessId: "biz-b", name: "Ana en B" });

    expect((await customers.find("biz-a", "user-1"))?.name).toBe("Ana en A");
    expect((await customers.find("biz-b", "user-1"))?.name).toBe("Ana en B");
  });

  it("lists only the customers of the requested business", async () => {
    await register({ businessId: "biz-a", userId: "u1" });
    await register({ businessId: "biz-a", userId: "u2" });
    await register({ businessId: "biz-b", userId: "u3" });

    const a = await new ListCustomers(customers).execute({ businessId: "biz-a" });
    const b = await new ListCustomers(customers).execute({ businessId: "biz-b" });
    expect(a.ok && a.value.customers.map((customer) => customer.userId).sort()).toEqual(["u1", "u2"]);
    expect(b.ok && b.value.customers.map((customer) => customer.userId)).toEqual(["u3"]);
  });

  it("does not read a timeline across businesses", async () => {
    await register({ businessId: "biz-a", userId: "u1" });
    const result = await new GetCustomerTimeline(customers, events).execute({ businessId: "biz-b", userId: "u1" });
    expect(!result.ok && result.error.code).toBe("crm/customer-not-found");
  });

  it("keeps events inside their own business", async () => {
    await register({ businessId: "biz-a", userId: "u1" });
    await register({ businessId: "biz-b", userId: "u1" });
    await new RecordCustomerEvent(customers, events).execute({ businessId: "biz-a", userId: "u1", type: "note", data: { text: "vip" } });

    const a = await new GetCustomerTimeline(customers, events).execute({ businessId: "biz-a", userId: "u1" });
    const b = await new GetCustomerTimeline(customers, events).execute({ businessId: "biz-b", userId: "u1" });
    expect(a.ok && a.value.events).toHaveLength(2);
    expect(b.ok && b.value.events).toHaveLength(1);
  });

  it("lists the businesses where a person is a customer", async () => {
    await register({ businessId: "biz-a", userId: "u1" });
    await register({ businessId: "biz-b", userId: "u1" });
    await register({ businessId: "biz-c", userId: "u2" });
    const result = await new ListMyCustomerBusinesses(customers).execute("u1");
    expect(result.ok && result.value.sort()).toEqual(["biz-a", "biz-b"]);
  });
});

describe("listing customers", () => {
  const seed = async (count: number) => {
    for (let index = 0; index < count; index += 1) {
      const created = Customer.create(
        { businessId: "biz-a", userId: `u${index}`, email: `u${index}@example.com`, name: `Customer ${index}`, source: "web" },
        new Date(Date.UTC(2026, 0, 1, 0, 0, index))
      );
      if (created.ok) await customers.createIfAbsent(created.value);
    }
  };

  it("pages newest first with a cursor and never repeats a row", async () => {
    await seed(5);
    const first = await new ListCustomers(customers).execute({ businessId: "biz-a", limit: 2 });
    expect(first.ok && first.value.customers.map((customer) => customer.userId)).toEqual(["u4", "u3"]);
    expect(first.ok && first.value.nextCursor).not.toBeNull();

    const second = await new ListCustomers(customers).execute({
      businessId: "biz-a",
      limit: 2,
      before: first.ok ? first.value.nextCursor ?? undefined : undefined,
    });
    expect(second.ok && second.value.customers.map((customer) => customer.userId)).toEqual(["u2", "u1"]);

    const third = await new ListCustomers(customers).execute({
      businessId: "biz-a",
      limit: 2,
      before: second.ok ? second.value.nextCursor ?? undefined : undefined,
    });
    expect(third.ok && third.value.customers.map((customer) => customer.userId)).toEqual(["u0"]);
    expect(third.ok && third.value.nextCursor).toBeNull();
  });

  it("clamps the page size", async () => {
    await seed(3);
    const tooSmall = await new ListCustomers(customers).execute({ businessId: "biz-a", limit: -5 });
    expect(tooSmall.ok && tooSmall.value.customers).toHaveLength(1);
    const huge = await new ListCustomers(customers).execute({ businessId: "biz-a", limit: 10_000 });
    expect(huge.ok && huge.value.customers).toHaveLength(3);
  });
});

describe("customer events", () => {
  it("refuses events for a customer who does not exist", async () => {
    const result = await new RecordCustomerEvent(customers, events).execute({ businessId: "biz-a", userId: "ghost", type: "note" });
    expect(!result.ok && result.error.code).toBe("crm/customer-not-found");
  });

  it("keeps an event with a stable id from being recorded twice", async () => {
    await register();
    const record = () =>
      new RecordCustomerEvent(customers, events).execute({ id: "same", businessId: "biz-a", userId: "user-1", type: "note" });
    await record();
    await record();
    const timeline = await new GetCustomerTimeline(customers, events).execute({ businessId: "biz-a", userId: "user-1" });
    expect(timeline.ok && timeline.value.events.filter((event) => event.id === "same")).toHaveLength(1);
  });

  it.each([
    ["an unknown type", { type: "teleport" }],
    ["nested data", { type: "note", data: { nested: { a: 1 } } as never }],
    ["an oversized string", { type: "note", data: { text: "x".repeat(201) } }],
    ["too many keys", { type: "note", data: Object.fromEntries(Array.from({ length: 21 }, (_, index) => [`k${index}`, index])) }],
  ])("rejects %s", (_label, overrides) => {
    expect(CustomerEvent.create({ businessId: "b", userId: "u", ...overrides }).ok).toBe(false);
  });

  it("orders the timeline newest first", async () => {
    await register();
    const early = CustomerEvent.create({ id: "early", businessId: "biz-a", userId: "user-1", type: "note" }, new Date("2026-01-01T00:00:00Z"));
    const late = CustomerEvent.create({ id: "late", businessId: "biz-a", userId: "user-1", type: "note" }, new Date("2027-01-01T00:00:00Z"));
    if (early.ok) await events.append(early.value);
    if (late.ok) await events.append(late.value);
    const timeline = await new GetCustomerTimeline(customers, events).execute({ businessId: "biz-a", userId: "user-1" });
    expect(timeline.ok && timeline.value.events[0].id).toBe("late");
  });
});
