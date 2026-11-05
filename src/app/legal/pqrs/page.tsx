import type { Metadata } from "next";
import { Mail, MessageCircle } from "lucide-react";
import { Co, LegalDoc, LegalSection } from "@/components/legal/LegalDoc";
import { Button } from "@/components/ui/button";
import { COMPANY, LEGAL_VERSIONS } from "@/lib/legal";
import { WHATSAPP_URL } from "@/lib/constants";

export const metadata: Metadata = { title: "Peticiones, quejas y reclamos | FRESKO" };

const SECTIONS = [
  { id: "canales", title: "Canales de atención" },
  { id: "informacion", title: "Qué información incluir" },
  { id: "plazos", title: "Plazos de respuesta" },
  { id: "sic", title: "Superintendencia de Industria y Comercio" },
];

export default function PqrsPage() {
  const subject = encodeURIComponent("PQRS FRESKO");
  const body = encodeURIComponent("Nombre:\nCorreo o celular de la cuenta:\nNúmero de pedido (si aplica):\nTipo (petición / queja / reclamo / sugerencia):\nDescripción:\n");
  return (
    <LegalDoc
      current="/legal/pqrs"
      title="Peticiones, quejas y reclamos (PQRS)"
      version={LEGAL_VERSIONS.terminos}
      sections={SECTIONS}
      intro={<p>Queremos saber cómo te fue. Aquí te contamos cómo presentar una petición, queja, reclamo o sugerencia, y en cuánto tiempo respondemos.</p>}
    >
      <LegalSection id="canales" title="1. Canales de atención">
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <a href={`mailto:${COMPANY.email}?subject=${subject}&body=${body}`}>
              <Mail className="h-4 w-4" /> Escribir un correo
            </a>
          </Button>
          <Button variant="secondary" asChild>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
          </Button>
        </div>
        <ul>
          <li><strong>Correo:</strong> <Co field="email" /></li>
          <li><strong>WhatsApp / teléfono:</strong> <Co field="phone" /></li>
          <li><strong>Dirección:</strong> <Co field="address" />, <Co field="city" /></li>
        </ul>
        <p>Para temas de datos personales escribe a <Co field="privacyEmail" /> (ver Política de tratamiento de datos).</p>
      </LegalSection>

      <LegalSection id="informacion" title="2. Qué información incluir">
        <ul>
          <li>Tu nombre y el correo o celular de tu cuenta.</li>
          <li>El número de pedido (por ejemplo, FR-1024), si aplica.</li>
          <li>Qué pasó y qué solicitas, con fotos si se trata de un producto en mal estado o distinto al pedido.</li>
        </ul>
        <p>Los reportes sobre la calidad de un producto deben hacerse dentro de las 24 horas siguientes a la entrega.</p>
      </LegalSection>

      <LegalSection id="plazos" title="3. Plazos de respuesta">
        <ul>
          <li><strong>Peticiones, quejas y reclamos de consumo:</strong> máximo quince (15) días hábiles.</li>
          <li><strong>Solicitudes de reversión del pago:</strong> dentro de los cinco (5) días hábiles siguientes a que conociste el hecho (ver Términos y condiciones).</li>
          <li><strong>Consultas de datos personales:</strong> diez (10) días hábiles; <strong>reclamos de datos:</strong> quince (15) días hábiles.</li>
        </ul>
      </LegalSection>

      <LegalSection id="sic" title="4. Superintendencia de Industria y Comercio">
        <p>
          Si no estás conforme con nuestra respuesta, puedes acudir a la Superintendencia de Industria y Comercio, autoridad de protección
          al consumidor y de datos personales en Colombia: www.sic.gov.co.
        </p>
      </LegalSection>
    </LegalDoc>
  );
}
