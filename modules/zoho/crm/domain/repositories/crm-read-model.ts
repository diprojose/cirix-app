import type {
  ActivityDto,
  CommercialContactDto,
  OpportunityDto,
} from "../../application/dtos/crm-dashboard-dto";

export interface CrmReadModel {
  listCommercialContacts(): Promise<CommercialContactDto[]>;
  listOpportunities(): Promise<OpportunityDto[]>;
  listActivities(): Promise<ActivityDto[]>;
}
