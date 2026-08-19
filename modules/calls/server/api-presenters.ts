import type { TrackedCall } from "../domain/call";

export function presentCall(call: TrackedCall) {
  return {
    id: call.id,
    callerPhone: call.callerPhone,
    trackingPhone: call.trackingPhone,
    startedAt: call.startedAt,
    ringingAt: call.ringingAt,
    answeredAt: call.answeredAt,
    endedAt: call.endedAt,
    status: call.status,
    durationSeconds: call.durationSeconds,
  };
}

