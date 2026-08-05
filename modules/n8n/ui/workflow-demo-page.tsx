import { getCurrentLocale } from "@/lib/i18n";
import { N8N_DEMO_WORKFLOW } from "@/modules/n8n/lib/demo-workflow";
import { WorkflowEditor } from "@/modules/n8n/ui/workflow-editor";

export async function WorkflowDemoPage() {
  return <WorkflowEditor locale={await getCurrentLocale()} workflow={N8N_DEMO_WORKFLOW} />;
}
