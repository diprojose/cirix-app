import Link from "next/link";
import type { ViewerDto } from "@/modules/iam/application/dtos/viewer-dto";

/**
 * PremiumBanner is the tier-aware entry point to the subscription area. Premium
 * viewers see a "your recipes" prompt; everyone else sees a subscribe pitch.
 * Both link to `/premium` for now — the gated `/recipes` route is future work.
 * The deep gradient keeps white text at AA contrast.
 */
export function PremiumBanner({ viewer }: { viewer: ViewerDto }) {
  const isPremium = viewer.permissions.canViewRecipes;

  return (
    <Link
      href="/premium"
      className="flex items-center gap-4 rounded-xl bg-gradient-to-br from-accent-strong to-brand-800 p-4 text-on-accent shadow-accent"
    >
      <span className="text-2xl" aria-hidden="true">
        👩‍🍳
      </span>
      <div className="flex-1">
        <p className="text-sm font-semibold">
          {isPremium ? "Tus recetas premium" : "Recetas premium"}
        </p>
        <p className="text-xs text-on-accent/80">
          {isPremium
            ? "Accede a los video tutoriales de los pasteleros."
            : "Suscríbete y aprende a hacerlos en casa."}
        </p>
      </div>
      <span className="shrink-0 text-sm font-medium">
        {isPremium ? "Ver" : "Ver plan"} →
      </span>
    </Link>
  );
}
