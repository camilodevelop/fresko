import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/sections/Hero";
import { PromoBenefitsBar } from "@/components/sections/PromoBenefitsBar";
import { CoverageValidator } from "@/components/sections/CoverageValidator";
import { Categories } from "@/components/sections/Categories";
import { BowlBuilderTeaser } from "@/components/sections/BowlBuilderTeaser";
import { MenuTeaser } from "@/components/sections/MenuTeaser";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { Subscriptions } from "@/components/sections/Subscriptions";
import { Testimonials } from "@/components/sections/Testimonials";
import { getActiveZones } from "@/lib/data/zones";

// Las zonas se editan en el panel; la landing se regenera al guardar y cada 5 min.
export const revalidate = 300;

export default async function HomePage() {
  const zones = await getActiveZones();
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <PromoBenefitsBar />
        <Categories />
        <CoverageValidator zones={zones} />
        <BowlBuilderTeaser />
        <MenuTeaser />
        <HowItWorks />
        <Subscriptions />
        <Testimonials />
      </main>
      <Footer />
    </>
  );
}
