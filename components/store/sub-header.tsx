import type { ReactNode } from "react";
import { BackButton } from "./back-button";
import { COLUMN } from "./layout";

/**
 * SubHeader is the mobile top bar for every screen below the home: back button,
 * centred title, optional trailing action. It exists because this exact markup
 * had been copy-pasted into nine route files, each ending with a `h-10 w-10`
 * spacer against a `h-11 w-11` back button, which left the title off-centre by
 * 4px on every one of them. The spacer here matches the button, so the title is
 * actually centred.
 *
 * Hidden from `md` up, where the desktop TopNav takes over.
 */
export function SubHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div
      className={`${COLUMN} flex items-center gap-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] md:hidden`}
    >
      <BackButton />
      <h1 className="flex-1 truncate text-center text-title font-semibold text-text">{title}</h1>
      {action ?? <span className="h-11 w-11 shrink-0" aria-hidden="true" />}
    </div>
  );
}
