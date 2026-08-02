/**
 * A delivery channel for notifications:
 * - `in_app` — the notification inbox in the app (the channel delivered today).
 * - `push`   — web push (pref captured; sender wired when VAPID is configured).
 * - `email`  — email (pref captured; sender wired when a provider is set up).
 */
export type NotificationChannel = "in_app" | "push" | "email";
