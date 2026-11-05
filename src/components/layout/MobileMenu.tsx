"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useNavActive } from "@/components/layout/NavActiveProvider";
import { Button } from "@/components/ui/button";
import { NAV_LINKS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useSignedIn } from "@/hooks/use-signed-in";

const MOBILE_MENU_TOP = "4.5rem";

type MobileMenuProps = {
  open: boolean;
  onClose: () => void;
};

function MobileNavItem({
  href,
  label,
  onClose,
}: {
  href: string;
  label: string;
  onClose: () => void;
}) {
  const { isActive, setActiveFromHref } = useNavActive();
  const active = isActive(href);

  return (
    <li>
      <Link
        href={href}
        onClick={() => {
          setActiveFromHref(href);
          onClose();
        }}
        aria-current={active ? "page" : undefined}
        className={cn(
          "block border-b border-[#1F4D36]/6 py-4 text-[15px] tracking-tight transition-colors",
          active
            ? "font-bold text-[#1F4D36]"
            : "font-medium text-[#1F4D36]/60 hover:text-[#1F4D36]"
        )}
      >
        {label}
      </Link>
    </li>
  );
}

export function MobileMenu({ open, onClose }: MobileMenuProps) {
  const signedIn = useSignedIn();
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#1F4D36]/15 backdrop-blur-[2px]"
            style={{ top: MOBILE_MENU_TOP }}
            onClick={onClose}
            aria-label="Cerrar menú"
          />

          <motion.nav
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 34, stiffness: 380 }}
            className="absolute right-0 flex w-full max-w-[min(100%,320px)] flex-col bg-[#F8F7F2] shadow-xl"
            style={{
              top: MOBILE_MENU_TOP,
              height: `calc(100dvh - ${MOBILE_MENU_TOP})`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-1 overflow-y-auto px-6 py-8">
              <ul>
                {NAV_LINKS.map((link) => (
                  <MobileNavItem
                    key={link.href}
                    href={link.href}
                    label={link.label}
                    onClose={onClose}
                  />
                ))}
              </ul>
            </div>

            <div className="shrink-0 border-t border-[#1F4D36]/8 px-6 py-5 pb-8">
              <Button className="w-full" asChild>
                <Link href={signedIn ? "/cuenta" : "/login"} onClick={onClose}>
                  {signedIn ? "Mi cuenta" : "Iniciar sesión"}
                </Link>
              </Button>
            </div>
          </motion.nav>
        </div>
      )}
    </AnimatePresence>
  );
}
