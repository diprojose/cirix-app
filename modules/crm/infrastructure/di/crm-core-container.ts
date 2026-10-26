import { adminFirestore } from "@/shared/infrastructure/firebase-admin";
import type { CustomerRepository } from "../../domain/repositories/customer-repository";
import type { CustomerEventRepository } from "../../domain/repositories/customer-event-repository";
import {
  FirestoreCustomerEventRepository,
  FirestoreCustomerRepository,
} from "../persistence/firestore-crm-repositories";
import { RegisterCustomer } from "../../application/use-cases/register-customer";
import { ListCustomers } from "../../application/use-cases/list-customers";
import { GetCustomerTimeline } from "../../application/use-cases/get-customer-timeline";
import { RecordCustomerEvent } from "../../application/use-cases/record-customer-event";
import { ListMyCustomerBusinesses } from "../../application/use-cases/list-my-customer-businesses";

/*
 * Composition root for the CRM core (customers and their timeline). The only
 * place that knows the concrete Firestore adapters, created lazily so importing
 * it needs no credentials at build time. Server-only.
 *
 * Not to be confused with `modules/zoho/crm`, the optional Zoho integration:
 * this core is the system of record and works without Zoho.
 */

let customerRepository: CustomerRepository | null = null;
let eventRepository: CustomerEventRepository | null = null;

function customers(): CustomerRepository {
  customerRepository ??= new FirestoreCustomerRepository(adminFirestore());
  return customerRepository;
}

function events(): CustomerEventRepository {
  eventRepository ??= new FirestoreCustomerEventRepository(adminFirestore());
  return eventRepository;
}

/** Builds the "register customer" use case (idempotent per business and person). */
export const makeRegisterCustomer = (): RegisterCustomer => new RegisterCustomer(customers(), events());

/** Builds the "list customers" use case (owner view of one business). */
export const makeListCustomers = (): ListCustomers => new ListCustomers(customers());

/** Builds the "customer timeline" use case. */
export const makeGetCustomerTimeline = (): GetCustomerTimeline => new GetCustomerTimeline(customers(), events());

/** Builds the "record customer event" use case, used by every later program. */
export const makeRecordCustomerEvent = (): RecordCustomerEvent => new RecordCustomerEvent(customers(), events());

/** Builds the "my customer businesses" use case (a person's cards). */
export const makeListMyCustomerBusinesses = (): ListMyCustomerBusinesses =>
  new ListMyCustomerBusinesses(customers());
