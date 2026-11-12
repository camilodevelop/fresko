import { ChannelPricesManager } from "@/components/catalog/ChannelPricesManager";
import { createClient } from "@/lib/supabase/server";

export default async function CanalesPage() {
  const supabase = await createClient();
  const [{ data: products }, { data: prices }] = await Promise.all([
    supabase.from("products").select("id, name, price, kind, active, sort, product_categories(name, sort)").order("sort").order("name"),
    supabase.from("product_channel_prices").select("product_id, channel, price"),
  ]);
  const priceOf = (id: string, channel: string) => prices?.find((p) => p.product_id === id && p.channel === channel)?.price ?? null;
  const rows = (products ?? [])
    .sort((a, b) => (a.product_categories?.sort ?? 0) - (b.product_categories?.sort ?? 0) || a.sort - b.sort)
    .map((p) => ({
      id: p.id,
      name: p.name,
      category: p.product_categories?.name ?? "",
      builder: p.kind === "builder",
      active: p.active,
      web: p.price,
      mostrador: priceOf(p.id, "mostrador"),
      punto: priceOf(p.id, "punto"),
    }));
  return <ChannelPricesManager rows={rows} />;
}
