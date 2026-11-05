import { StatusBadge } from "@/components/dashboard/ui";
import { ORDER_STATUS, PAYMENT_STATUS } from "@/lib/delivery";

export function OrderStatusBadge({ status }: { status: string }) {
  const s = ORDER_STATUS[status] ?? { label: status, tone: "gray" as const };
  return <StatusBadge tone={s.tone}>{s.label}</StatusBadge>;
}

export function PaymentStatusBadge({ status }: { status: string }) {
  const s = PAYMENT_STATUS[status] ?? { label: status, tone: "gray" as const };
  return (
    <StatusBadge tone={s.tone} dot={false}>
      {s.label}
    </StatusBadge>
  );
}
