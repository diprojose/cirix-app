import "server-only";
import type { CrmReadModel } from "../../domain/repositories/crm-read-model";
import { GetCrmDashboard } from "../../application/use-cases/get-crm-dashboard";
import { MockZohoCrmReadModel } from "../adapters/mock-zoho-crm-read-model";

let crmReadModel: CrmReadModel | null = null;

function readModel(): CrmReadModel {
  crmReadModel ??= new MockZohoCrmReadModel();
  return crmReadModel;
}

export const makeGetCrmDashboard = (): GetCrmDashboard => new GetCrmDashboard(readModel());
