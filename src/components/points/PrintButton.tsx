"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton() {
  return (
    <Button size="lg" onClick={() => window.print()} className="print:hidden">
      <Printer className="h-5 w-5" /> Imprimir
    </Button>
  );
}
