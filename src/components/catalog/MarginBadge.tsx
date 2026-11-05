import { StatusBadge } from "@/components/dashboard/ui";
import { formatPercent } from "@/lib/pricing";

/** Verde si cumple el margen objetivo, ámbar si está cerca (−10 pts), rojo si está lejos. */
export function MarginBadge({ margin, target }: { margin: number; target: number }) {
  const tone = margin >= target - 0.005 ? "green" : margin >= target - 0.1 ? "amber" : "red";
  return <StatusBadge tone={tone}>{formatPercent(margin)}</StatusBadge>;
}
