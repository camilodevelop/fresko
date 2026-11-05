import { SettingsForm } from "@/components/catalog/SettingsForm";
import { loadPricingSettings } from "@/lib/catalog-admin";

export default async function AjustesPage() {
  const settings = await loadPricingSettings();
  return <SettingsForm settings={settings} />;
}
