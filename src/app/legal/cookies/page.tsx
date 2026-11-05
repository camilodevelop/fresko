import type { Metadata } from "next";
import { LegalDoc, LegalSection } from "@/components/legal/LegalDoc";
import { LEGAL_VERSIONS } from "@/lib/legal";

export const metadata: Metadata = { title: "Política de cookies | FRESKO" };

const SECTIONS = [
  { id: "que-son", title: "Qué son" },
  { id: "cuales", title: "Qué usamos" },
  { id: "terceros", title: "Servicios de terceros" },
  { id: "control", title: "Cómo controlarlas" },
];

const ROWS = [
  { name: "sb-…-auth-token", type: "Cookie necesaria", purpose: "Mantener tu sesión iniciada de forma segura.", duration: "Mientras la sesión esté activa" },
  { name: "fresko_sidebar", type: "Cookie de preferencia", purpose: "Recordar si dejaste el menú del panel colapsado.", duration: "1 año" },
  { name: "fresko_cart_v2", type: "Almacenamiento local", purpose: "Guardar los productos de tu carrito en este navegador.", duration: "Hasta que lo vacíes o pagues" },
];

export default function CookiesPage() {
  return (
    <LegalDoc
      current="/legal/cookies"
      title="Política de cookies"
      version={LEGAL_VERSIONS.cookies}
      sections={SECTIONS}
      intro={<p>Esta política explica qué cookies y tecnologías similares usa el sitio de FRESKO y para qué.</p>}
    >
      <LegalSection id="que-son" title="1. Qué son">
        <p>
          Las cookies son pequeños archivos que el sitio guarda en tu navegador. El almacenamiento local cumple una función parecida:
          permite recordar información entre visitas.
        </p>
      </LegalSection>

      <LegalSection id="cuales" title="2. Qué usamos">
        <p>
          <strong>Solo usamos cookies necesarias para que el sitio funcione y para recordar tus preferencias.</strong> No usamos cookies de
          publicidad ni de seguimiento. Si en el futuro incorporamos herramientas de analítica, te pediremos tu consentimiento antes de activarlas.
        </p>
        <div className="overflow-x-auto rounded-2xl ring-1 ring-[#1F4D36]/10">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-[#F8F7F2] text-[11px] font-bold uppercase tracking-wider text-[#1B1B1B]/45">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Para qué</th>
                <th className="px-4 py-3">Duración</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.name} className="border-t border-[#1F4D36]/[0.06]">
                  <td className="px-4 py-3 font-mono text-xs text-[#1F4D36]">{r.name}</td>
                  <td className="px-4 py-3">{r.type}</td>
                  <td className="px-4 py-3">{r.purpose}</td>
                  <td className="px-4 py-3">{r.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </LegalSection>

      <LegalSection id="terceros" title="3. Servicios de terceros">
        <p>
          El mapa de cobertura carga imágenes de OpenStreetMap, y la búsqueda de direcciones consulta servicios de Esri/ArcGIS y
          Photon. Estos servicios pueden recibir tu dirección IP al mostrar el mapa. Si inicias sesión con Google, aplican también las
          políticas de Google.
        </p>
      </LegalSection>

      <LegalSection id="control" title="4. Cómo controlarlas">
        <p>
          Puedes borrar o bloquear las cookies desde la configuración de tu navegador. Si bloqueas las cookies necesarias no podrás
          iniciar sesión ni hacer pedidos.
        </p>
      </LegalSection>
    </LegalDoc>
  );
}
