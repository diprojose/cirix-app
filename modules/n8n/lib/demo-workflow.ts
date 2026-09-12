export type WorkflowStatus = "live" | "conditional" | "mock";

export type WorkflowNode = {
  id: string;
  label: string;
  labelEs?: string;
  subtitle: string;
  subtitleEs?: string;
  glyph: string;
  kind: "trigger" | "agent" | "decision" | "action";
  x: number;
  y: number;
  status: WorkflowStatus;
  tone?: "brand" | "accent" | "action";
};

export type WorkflowEdge = {
  id: string;
  from: string;
  to: string;
  label?: string;
  labelEs?: string;
  labelX?: number;
  labelY?: number;
};

export type WorkflowDemo = {
  title: string;
  summary: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  automations: Array<{
    title: string;
    titleEs?: string;
    detail: string;
    detailEs?: string;
    status: WorkflowStatus;
  }>;
};

export const N8N_DEMO_WORKFLOW: WorkflowDemo = {
  title: "Automation Studio",
  summary:
    "Automations to capture, validate, and turn leads into commercial meetings using each tenant's availability.",
  nodes: [
    {
      id: "subscriber-list",
      label: "Subscribers",
      labelEs: "Suscriptores",
      subtitle: "Only email available",
      subtitleEs: "Solo hay correo disponible",
      glyph: "S",
      kind: "trigger",
      x: 42,
      y: 112,
      status: "live",
      tone: "brand",
    },
    {
      id: "email-sequence",
      label: "Send nurture email",
      labelEs: "Enviar email de seguimiento",
      subtitle: "Push subscriber to lead form",
      subtitleEs: "Llevar suscriptor al formulario de lead",
      glyph: "@",
      kind: "action",
      x: 314,
      y: 112,
      status: "live",
      tone: "accent",
    },
    {
      id: "lead-form",
      label: "Lead form submission",
      labelEs: "Envío del formulario de lead",
      subtitle: "Complete data for lead intake",
      subtitleEs: "Completar datos para registrar el lead",
      glyph: "F",
      kind: "action",
      x: 586,
      y: 112,
      status: "live",
      tone: "accent",
    },
    {
      id: "validate-florida",
      label: "Validate Florida data",
      labelEs: "Validar datos de Florida",
      subtitle: "Florida phone, location, county",
      subtitleEs: "Teléfono, ubicación y condado de Florida",
      glyph: "?",
      kind: "decision",
      x: 858,
      y: 112,
      status: "conditional",
      tone: "action",
    },
    {
      id: "qualified-lead",
      label: "Qualified lead",
      labelEs: "Lead calificado",
      subtitle: "Valid lead for CRM pipeline",
      subtitleEs: "Lead válido para el pipeline del CRM",
      glyph: "L",
      kind: "action",
      x: 1164,
      y: 44,
      status: "live",
      tone: "accent",
    },
    {
      id: "schedule-appointment",
      label: "Schedule appointment",
      labelEs: "Agendar cita",
      subtitle: "Send a booking link using the tenant calendar",
      subtitleEs: "Enviar link de reserva con el calendario del cliente",
      glyph: "C",
      kind: "action",
      x: 1164,
      y: 404,
      status: "live",
      tone: "accent",
    },    {
      id: "inbound-call",
      label: "Inbound call",
      labelEs: "Llamada entrante",
      subtitle: "Call to designated Florida number",
      subtitleEs: "Llamada al número designado de Florida",
      glyph: "C",
      kind: "trigger",
      x: 164,
      y: 364,
      status: "live",
      tone: "brand",
    },
    {
      id: "has-email",
      label: "Did caller share email?",
      labelEs: "¿El caller compartió su email?",
      subtitle: "Decide subscriber vs lead path",
      subtitleEs: "Define la ruta de subscriber o lead",
      glyph: "?",
      kind: "decision",
      x: 442,
      y: 364,
      status: "conditional",
      tone: "action",
    },
    {
      id: "create-subscriber",
      label: "Create subscriber",
      labelEs: "Crear subscriber",
      subtitle: "Save caller as subscriber",
      subtitleEs: "Guardar caller como subscriber",
      glyph: "+",
      kind: "action",
      x: 442,
      y: 530,
      status: "live",
      tone: "accent",
    },
    {
      id: "request-form",
      label: "Request lead form",
      labelEs: "Solicitar formulario de lead",
      subtitle: "Caller must complete web form",
      subtitleEs: "El caller debe completar el formulario web",
      glyph: "F",
      kind: "action",
      x: 700,
      y: 364,
      status: "mock",
      tone: "brand",
    },
  ],
  edges: [
    { id: "e1", from: "subscriber-list", to: "email-sequence" },
    { id: "e2", from: "email-sequence", to: "lead-form" },
    { id: "e3", from: "lead-form", to: "validate-florida" },
    { id: "e4", from: "validate-florida", to: "qualified-lead", label: "passes", labelEs: "válido", labelX: 1118, labelY: 70 },
    { id: "e10", from: "qualified-lead", to: "schedule-appointment", label: "schedule", labelEs: "agendar", labelX: 1302, labelY: 300 },
    { id: "e5", from: "validate-florida", to: "needs-review", label: "fails", labelEs: "inválido", labelX: 1118, labelY: 230 },
    { id: "e6", from: "inbound-call", to: "has-email" },
    { id: "e7", from: "has-email", to: "create-subscriber", label: "email given", labelEs: "con email", labelX: 756, labelY: 516 },
    { id: "e8", from: "has-email", to: "request-form", label: "no email", labelEs: "sin email", labelX: 686, labelY: 340 },
    { id: "e9", from: "request-form", to: "lead-form", label: "form completed", labelEs: "formulario completo", labelX: 760, labelY: 286 },
  ],
  automations: [
    {
      title: "Subscriber outreach",
      titleEs: "Contacto a subscribers",
      detail:
        "Send emails to subscribers when only their email is available and guide them to the lead form.",
      detailEs:
        "Enviar correos a subscribers cuando solo se tiene el email y llevarlos al formulario de leads para completar su información.",
      status: "live",
    },
    {
      title: "Florida lead validation",
      titleEs: "Validación de leads de Florida",
      detail:
        "When a lead enters, validate the Florida phone, Florida location, and target county before sending it to the CRM.",
      detailEs:
        "Cuando entra un lead, validar número de Florida, ubicación en Florida y condado objetivo antes de dejarlo pasar al CRM.",
      status: "conditional",
    },
  ],
};
