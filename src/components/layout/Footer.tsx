import Image from "next/image";
import Link from "next/link";
import { AtSign, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { WHATSAPP_URL } from "@/lib/constants";

const footerLinks = {
  navegacion: [
    { href: "/", label: "Inicio" },
    { href: "/menu", label: "Menú" },
    { href: "/arma-tu-bowl", label: "Arma tu bowl" },
    { href: "#suscripciones", label: "Suscripciones" },
  ],
  legal: [
    { href: "#", label: "Términos y condiciones" },
    { href: "#", label: "Política de privacidad" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-[#1F4D36]/10 bg-[#1F4D36] text-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3">
              <Image
                src="/images/logo.png"
                alt="FRESKO"
                width={48}
                height={48}
                className="h-12 w-12 rounded-full bg-white/10 p-1 object-contain"
              />
              <div>
                <p className="font-display text-xl font-bold">FRESKO</p>
                <p className="text-xs text-white/60">Bowls & Ensaladas · Bogotá</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-white/70">
              Comida fresca, saludable y hecha para ti. Entregamos en las mejores
              zonas de Bogotá.
            </p>
            <div className="mt-6 flex gap-3">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-[#8BC34A] hover:text-[#1F4D36]"
                aria-label="Instagram"
              >
                <AtSign className="h-4 w-4" />
              </a>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-[#8BC34A] hover:text-[#1F4D36]"
                aria-label="WhatsApp"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider">
              Navegación
            </h3>
            <ul className="mt-4 space-y-2">
              {footerLinks.navegacion.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/70 transition-colors hover:text-[#8BC34A]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider">
              Contacto
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-white/70">
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-[#8BC34A]" />
                +57 300 123 4567
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-[#8BC34A]" />
                hola@fresko.co
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#8BC34A]" />
                Bogotá, Colombia
              </li>
            </ul>
            <Link
              href="#cobertura"
              className="mt-4 inline-block text-sm font-medium text-[#8BC34A] hover:underline"
            >
              Verificar cobertura →
            </Link>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider">
              Legal
            </h3>
            <ul className="mt-4 space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/70 transition-colors hover:text-[#8BC34A]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row">
          <p className="text-xs text-white/50">
            © {new Date().getFullYear()} FRESKO. Todos los derechos reservados.
          </p>
          <p className="text-xs text-white/50">Hecho con 🥗 en Bogotá</p>
        </div>
      </div>
    </footer>
  );
}
