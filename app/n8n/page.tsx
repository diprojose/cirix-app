import type { Metadata } from "next";
import { WorkflowDemoPage } from "@/modules/n8n/ui/workflow-demo-page";

export const metadata: Metadata = {
  title: "n8n Automation Studio",
  description: "Visual automation demo module for operational workflows and CRM handoffs.",
};

export default function N8nPage() {
  return <WorkflowDemoPage />;
}
