import type { Metadata } from "next";
import Link from "next/link";
import { Co, LegalDoc, LegalSection } from "@/components/legal/LegalDoc";
import { LEGAL_VERSIONS } from "@/lib/legal";

export const metadata: Metadata = { title: "Política de tratamiento de datos personales | FRESKO" };

const SECTIONS = [
  { id: "responsable", title: "Responsable del tratamiento" },
  { id: "marco", title: "Marco legal y definiciones" },
  { id: "datos", title: "Datos que tratamos" },
  { id: "finalidades", title: "Finalidades" },
  { id: "autorizacion", title: "Autorización" },
  { id: "derechos", title: "Tus derechos" },
  { id: "procedimiento", title: "Consultas y reclamos" },
  { id: "encargados", title: "Encargados y transferencias" },
  { id: "seguridad", title: "Seguridad" },
  { id: "conservacion", title: "Conservación" },
  { id: "menores", title: "Menores de edad" },
  { id: "vigencia", title: "Vigencia y cambios" },
];

export default function PrivacidadPage() {
  return (
    <LegalDoc
      current="/legal/privacidad"
      title="Política de tratamiento de datos personales"
      version={LEGAL_VERSIONS.privacidad}
      sections={SECTIONS}
      intro={
        <p>
          En FRESKO cuidamos tus datos personales. Esta política explica qué datos recogemos, para qué los usamos, con quién los
          compartimos y cómo puedes ejercer tus derechos, en cumplimiento de la Ley 1581 de 2012, el Decreto 1377 de 2013 (compilado en el
          Decreto 1074 de 2015) y demás normas sobre protección de datos personales en Colombia.
        </p>
      }
    >
      <LegalSection id="responsable" title="1. Responsable del tratamiento">
        <ul>
          <li><strong>Responsable:</strong> <Co field="legalName" /> (marca FRESKO)</li>
          <li><strong>NIT / identificación:</strong> <Co field="taxId" /></li>
          <li><strong>Domicilio:</strong> <Co field="address" />, <Co field="city" /></li>
          <li><strong>Canal para temas de datos personales:</strong> <Co field="privacyEmail" /></li>
          <li><strong>Teléfono / WhatsApp:</strong> <Co field="phone" /></li>
        </ul>
      </LegalSection>

      <LegalSection id="marco" title="2. Marco legal y definiciones">
        <ul>
          <li><strong>Dato personal:</strong> información vinculada a una persona natural determinada o determinable.</li>
          <li><strong>Titular:</strong> la persona cuyos datos se tratan (tú).</li>
          <li><strong>Tratamiento:</strong> cualquier operación sobre datos personales: recolección, almacenamiento, uso, circulación o supresión.</li>
          <li><strong>Responsable:</strong> quien decide sobre el tratamiento (FRESKO). <strong>Encargado:</strong> quien trata datos por cuenta del responsable (por ejemplo, nuestros proveedores tecnológicos).</li>
          <li><strong>Autorización:</strong> tu consentimiento previo, expreso e informado para el tratamiento.</li>
        </ul>
      </LegalSection>

      <LegalSection id="datos" title="3. Datos que tratamos">
        <ul>
          <li><strong>Identificación y contacto:</strong> nombre, correo electrónico, celular y, si la subes, tu foto de perfil.</li>
          <li><strong>Ubicación:</strong> las direcciones de entrega que registras, sus detalles (apartamento, indicaciones) y su ubicación en el mapa.</li>
          <li><strong>Compras:</strong> pedidos, planes, fechas y franjas de entrega, notas para la entrega y estado de los pagos. Los datos completos de tarjetas los procesa la pasarela de pagos; FRESKO no los almacena.</li>
          <li><strong>Técnicos:</strong> dirección IP, tipo de navegador y las cookies necesarias para mantener tu sesión (ver <Link href="/legal/cookies" className="font-semibold text-[#1F4D36] underline">Política de cookies</Link>).</li>
          <li><strong>Datos sensibles:</strong> no los solicitamos. Si decides contarnos una alergia o condición de salud en las notas de un pedido, la usaremos solo para preparar tu pedido de forma segura. Responder sobre datos sensibles es facultativo.</li>
        </ul>
      </LegalSection>

      <LegalSection id="finalidades" title="4. Finalidades">
        <p>Usamos tus datos para:</p>
        <ol>
          <li>Crear y administrar tu cuenta y autenticarte (incluido el inicio de sesión con Google, si lo eliges).</li>
          <li>Recibir, preparar, cobrar y entregar tus pedidos y planes. Para la entrega compartimos con el domiciliario tu nombre, celular, dirección e indicaciones.</li>
          <li>Verificar que tu dirección esté dentro de nuestras zonas de cobertura.</li>
          <li>Enviarte mensajes del servicio: confirmaciones, estado del pedido y avisos sobre tu cuenta (por la plataforma, correo o WhatsApp).</li>
          <li>Atender peticiones, quejas, reclamos, garantías y solicitudes de reversión de pagos.</li>
          <li>Cumplir obligaciones legales, contables y tributarias, y atender requerimientos de autoridades.</li>
          <li>Prevenir fraude y proteger la seguridad del servicio.</li>
          <li>Hacer análisis internos para mejorar el menú y la operación, de forma agregada.</li>
          <li><strong>Solo si lo autorizas aparte:</strong> enviarte novedades, promociones y encuestas. Puedes revocar esta autorización en cualquier momento desde Mi perfil.</li>
        </ol>
      </LegalSection>

      <LegalSection id="autorizacion" title="5. Autorización">
        <p>
          Al crear tu cuenta marcas una casilla con la que autorizas el tratamiento de tus datos para las finalidades 1 a 8. La
          autorización para comunicaciones comerciales es una casilla separada y opcional. Conservamos prueba de cada autorización:
          versión del documento, fecha, hora, método y datos técnicos del momento de la aceptación.
        </p>
      </LegalSection>

      <LegalSection id="derechos" title="6. Tus derechos">
        <p>Como titular tienes derecho a:</p>
        <ul>
          <li>Conocer, actualizar y rectificar tus datos. Puedes hacerlo directamente en <strong>Mi perfil</strong> y <strong>Direcciones</strong>.</li>
          <li>Solicitar prueba de la autorización que nos diste.</li>
          <li>Ser informado sobre el uso que hemos dado a tus datos.</li>
          <li>Revocar la autorización o pedir la supresión de tus datos cuando no exista un deber legal o contractual de conservarlos.</li>
          <li>Acceder gratuitamente a tus datos.</li>
          <li>Presentar quejas ante la Superintendencia de Industria y Comercio (SIC), después de haber agotado el trámite de consulta o reclamo con nosotros.</li>
        </ul>
      </LegalSection>

      <LegalSection id="procedimiento" title="7. Consultas y reclamos">
        <p>
          Escríbenos a <Co field="privacyEmail" /> desde el correo registrado en tu cuenta, indicando tu nombre, el correo o celular de la
          cuenta, la descripción de tu solicitud y, si aplica, los documentos de soporte.
        </p>
        <ul>
          <li><strong>Consultas:</strong> respondemos en máximo diez (10) días hábiles. Si no es posible, te informaremos el motivo y la fecha de respuesta, que no superará cinco (5) días hábiles adicionales.</li>
          <li><strong>Reclamos</strong> (corrección, actualización, supresión o incumplimiento): respondemos en máximo quince (15) días hábiles, prorrogables hasta por ocho (8) días hábiles más, informándote el motivo.</li>
          <li>Si el reclamo está incompleto te pediremos completarlo dentro de los cinco (5) días siguientes. Si pasan dos (2) meses sin respuesta, entenderemos que desististe.</li>
        </ul>
      </LegalSection>

      <LegalSection id="encargados" title="8. Encargados y transferencias">
        <p>Para prestar el servicio usamos proveedores que tratan datos por nuestra cuenta y bajo nuestras instrucciones:</p>
        <ul>
          <li><strong>Supabase:</strong> base de datos, autenticación y almacenamiento de fotos.</li>
          <li><strong>Vercel:</strong> alojamiento del sitio web.</li>
          <li><strong>Google:</strong> inicio de sesión con tu cuenta de Google, solo si lo eliges.</li>
          <li><strong>Servicios de mapas y búsqueda de direcciones</strong> (OpenStreetMap, Esri/ArcGIS, Photon): reciben el texto o la ubicación que buscas para mostrar el mapa y sugerir direcciones.</li>
          <li><strong>Pasarela de pagos:</strong> procesa los pagos con sus propias políticas de seguridad.</li>
        </ul>
        <p>
          Algunos de estos proveedores tienen servidores fuera de Colombia, por ejemplo en Estados Unidos. Esa transmisión internacional se
          hace con proveedores que ofrecen niveles adecuados de protección y bajo condiciones contractuales de confidencialidad y seguridad,
          conforme al artículo 26 de la Ley 1581 de 2012. No vendemos ni alquilamos tus datos.
        </p>
      </LegalSection>

      <LegalSection id="seguridad" title="9. Seguridad">
        <p>
          Aplicamos medidas técnicas y administrativas razonables: conexión cifrada (HTTPS), contraseñas cifradas, acceso del equipo por
          roles y permisos, y reglas en la base de datos para que cada usuario vea solo su información.
        </p>
      </LegalSection>

      <LegalSection id="conservacion" title="10. Conservación">
        <p>
          Conservamos tus datos mientras tu cuenta esté activa y durante el tiempo necesario para cumplir obligaciones legales. Por
          ejemplo, la información contable y de facturación se conserva por diez (10) años según la normativa comercial. Cuando pidas
          la supresión eliminaremos o anonimizaremos los datos que no estemos obligados a conservar.
        </p>
      </LegalSection>

      <LegalSection id="menores" title="11. Menores de edad">
        <p>
          FRESKO está dirigido a mayores de 18 años. No recolectamos de forma intencional datos de niños, niñas o adolescentes. Si
          detectamos una cuenta de un menor, la eliminaremos.
        </p>
      </LegalSection>

      <LegalSection id="vigencia" title="12. Vigencia y cambios">
        <p>
          Esta política rige desde la fecha indicada arriba. Si la modificamos de forma sustancial te avisaremos y te pediremos aceptarla
          de nuevo. Las bases de datos se conservarán mientras exista la finalidad del tratamiento. FRESKO inscribirá sus bases de datos
          en el Registro Nacional de Bases de Datos (RNBD) de la SIC cuando le sea exigible.
        </p>
      </LegalSection>
    </LegalDoc>
  );
}
