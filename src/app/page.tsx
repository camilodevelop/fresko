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

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <PromoBenefitsBar />
        <Categories />
        <CoverageValidator />
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
