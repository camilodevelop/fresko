import type { Metadata } from "next";
import Link from "next/link";
import { Co, LegalDoc, LegalSection } from "@/components/legal/LegalDoc";
import { LEGAL_VERSIONS } from "@/lib/legal";

export const metadata: Metadata = { title: "Términos y condiciones | FRESKO" };

const SECTIONS = [
  { id: "quienes-somos", title: "Quiénes somos" },
  { id: "aceptacion", title: "Aceptación" },
  { id: "cuenta", title: "Tu cuenta" },
  { id: "productos", title: "Productos, ingredientes y alérgenos" },
  { id: "precios", title: "Precios y pagos" },
  { id: "entregas", title: "Cobertura, entregas y hora de corte" },
  { id: "planes", title: "Planes de suscripción" },
  { id: "cancelaciones", title: "Cambios y cancelaciones" },
  { id: "retracto", title: "Derecho de retracto" },
  { id: "reversion", title: "Reversión del pago" },
  { id: "calidad", title: "Calidad y garantía" },
  { id: "responsabilidad", title: "Responsabilidad" },
  { id: "propiedad", title: "Propiedad intelectual" },
  { id: "pqrs", title: "Atención al cliente y PQRS" },
  { id: "cambios", title: "Cambios a estos términos" },
  { id: "ley", title: "Ley aplicable" },
];

export default function TerminosPage() {
  return (
    <LegalDoc
      current="/legal/terminos"
      title="Términos y condiciones"
      version={LEGAL_VERSIONS.terminos}
      sections={SECTIONS}
      intro={
        <p>
          Estos términos regulan el uso del sitio y la compra de productos y planes de FRESKO. Se rigen por la Ley 1480 de 2011
          (Estatuto del Consumidor), la Ley 527 de 1999 (comercio electrónico) y demás normas aplicables en Colombia. Léelos con
          atención: al crear tu cuenta o hacer un pedido declaras que los conoces y los aceptas.
        </p>
      }
    >
      <LegalSection id="quienes-somos" title="1. Quiénes somos">
        <p>El sitio y el servicio FRESKO son operados por:</p>
        <ul>
          <li><strong>Titular:</strong> <Co field="legalName" /></li>
          <li><strong>NIT / identificación:</strong> <Co field="taxId" /></li>
          <li><strong>Dirección de notificaciones:</strong> <Co field="address" />, <Co field="city" /></li>
          <li><strong>Correo:</strong> <Co field="email" /> · <strong>Teléfono / WhatsApp:</strong> <Co field="phone" /></li>
        </ul>
      </LegalSection>

      <LegalSection id="aceptacion" title="2. Aceptación">
        <p>
          Para comprar debes crear una cuenta y aceptar estos términos y la{" "}
          <Link href="/legal/privacidad" className="font-semibold text-[#1F4D36] underline">Política de tratamiento de datos personales</Link>.
          Guardamos la fecha, la versión aceptada y datos técnicos de la aceptación como prueba.
        </p>
      </LegalSection>

      <LegalSection id="cuenta" title="3. Tu cuenta">
        <ul>
          <li>El servicio está dirigido a personas mayores de 18 años.</li>
          <li>Debes registrar datos verdaderos y mantenerlos actualizados (nombre, correo, celular y direcciones de entrega).</li>
          <li>Eres responsable de la confidencialidad de tu contraseña y de las compras hechas con tu cuenta. Si sospechas un uso no autorizado, avísanos de inmediato.</li>
          <li>Podemos suspender cuentas usadas para fraude, suplantación o uso abusivo del servicio.</li>
        </ul>
      </LegalSection>

      <LegalSection id="productos" title="4. Productos, ingredientes y alérgenos">
        <ul>
          <li>Las fotos son ilustrativas; la presentación puede variar según los ingredientes del día.</li>
          <li>Cada producto indica sus ingredientes principales. Nuestros platos pueden contener o haber tenido contacto con alérgenos (frutos secos, lácteos, huevo, gluten, mariscos, soya, entre otros).</li>
          <li><strong>Si tienes una alergia o restricción alimentaria, revisa los ingredientes y escríbelo en las notas del pedido.</strong> Si tienes dudas, contáctanos antes de comprar.</li>
          <li>Si un ingrediente no está disponible podemos reemplazarlo por uno equivalente, avisándote; si no lo aceptas, puedes cancelar ese producto con reembolso.</li>
        </ul>
      </LegalSection>

      <LegalSection id="precios" title="5. Precios y pagos">
        <ul>
          <li>Los precios están en pesos colombianos (COP) e incluyen los impuestos aplicables. El domicilio dentro de las zonas de cobertura es gratis, salvo que se indique otra cosa antes de pagar.</li>
          <li>El total se confirma al momento de pagar con los precios vigentes. Un pedido ya pagado conserva su precio aunque luego cambie el menú.</li>
          <li>Los pagos se hacen en línea a través de una pasarela de pagos autorizada. FRESKO no almacena los datos completos de tus tarjetas.</li>
          <li>El pedido queda confirmado solo cuando la pasarela aprueba el pago. Si el pago es rechazado puedes reintentarlo.</li>
        </ul>
      </LegalSection>

      <LegalSection id="entregas" title="6. Cobertura, entregas y hora de corte">
        <ul>
          <li>Solo entregamos en direcciones dentro de nuestras zonas de cobertura, que se muestran en el mapa del sitio.</li>
          <li>Eliges el día y la franja horaria al pagar. Para recibir el mismo día debes pedir antes de la hora de corte de tu zona; después de esa hora, el pedido puede programarse desde el día siguiente.</li>
          <li>Debe haber alguien para recibir en la franja elegida. Si el domiciliario no logra entregar por causas atribuibles al cliente (dirección errada, nadie recibe, sin respuesta al celular), el pedido se considera entregado y no habrá reembolso, salvo que acordemos una nueva entrega.</li>
          <li>Haremos lo posible por entregar dentro de la franja; demoras por causas ajenas (tráfico extraordinario, clima, orden público) no generan responsabilidad, pero te avisaremos.</li>
        </ul>
      </LegalSection>

      <LegalSection id="planes" title="7. Planes de suscripción">
        <ul>
          <li>Un plan es la compra anticipada de un número de platos con descuento. Cada plan indica sus platos, su descuento y su vigencia, es decir, el tiempo que tienes para programar las entregas desde la compra.</li>
          <li><strong>Los planes no se renuevan automáticamente.</strong> Los platos que no programes dentro de la vigencia vencen y no son reembolsables.</li>
          <li>El valor del plan es la suma de los platos que elijas, cada uno con un valor mínimo (valor base por porción), menos el descuento del plan. Los platos de mayor valor suman la diferencia y el descuento aplica sobre el total.</li>
          <li>Puedes cambiar los platos o la franja de una entrega hasta la hora de corte del día de esa entrega. Si cambias a un plato de mayor valor pagas la diferencia con tu descuento; si cambias a uno de menor valor, no hay devolución de la diferencia.</li>
          <li>Se permite una entrega por día por plan.</li>
        </ul>
      </LegalSection>

      <LegalSection id="cancelaciones" title="8. Cambios y cancelaciones">
        <ul>
          <li>Puedes cancelar un pedido que aún no has pagado desde tu cuenta.</li>
          <li>Un pedido pagado puede cancelarse sin costo si lo solicitas antes de la hora de corte del día de entrega y antes de que entre en preparación. Escríbenos por los canales de atención.</li>
          <li>Si FRESKO no puede cumplir un pedido (falta de insumos, fuerza mayor o fallas operativas), te avisaremos y te devolveremos el valor pagado.</li>
          <li>Los reembolsos se hacen por el mismo medio de pago, en un plazo máximo de 30 días calendario.</li>
        </ul>
      </LegalSection>

      <LegalSection id="retracto" title="9. Derecho de retracto">
        <p>
          De acuerdo con el artículo 47 de la Ley 1480 de 2011, el derecho de retracto <strong>no aplica a bienes perecederos</strong>, como
          los alimentos preparados que vendemos. En el caso de los planes de suscripción, puedes retractarte dentro de los cinco (5) días
          hábiles siguientes a la compra, siempre que no hayas recibido ninguna entrega del plan; te devolveremos el dinero en un plazo
          máximo de treinta (30) días calendario.
        </p>
      </LegalSection>

      <LegalSection id="reversion" title="10. Reversión del pago">
        <p>
          Según el artículo 51 de la Ley 1480 de 2011 y el Decreto 587 de 2016, puedes solicitar la reversión de un pago hecho con
          tarjeta de crédito, débito u otro instrumento electrónico cuando: (i) seas víctima de fraude, (ii) la operación no haya sido
          solicitada, (iii) el producto no se haya recibido, o (iv) el producto recibido no corresponda a lo solicitado o sea defectuoso.
          Debes presentar la solicitud dentro de los cinco (5) días hábiles siguientes a la fecha en que tuviste noticia del hecho, ante
          FRESKO y ante el emisor del instrumento de pago.
        </p>
      </LegalSection>

      <LegalSection id="calidad" title="11. Calidad y garantía">
        <ul>
          <li>Preparamos los platos el mismo día de la entrega. Recomendamos consumirlos ese día y mantenerlos refrigerados.</li>
          <li>Si recibes un producto en mal estado, incompleto o distinto al pedido, repórtalo dentro de las 24 horas siguientes a la entrega, con fotos, por los canales de atención. Te ofreceremos reposición del producto o devolución de su valor.</li>
          <li>No respondemos por el deterioro causado por almacenamiento inadecuado después de la entrega.</li>
        </ul>
      </LegalSection>

      <LegalSection id="responsabilidad" title="12. Responsabilidad">
        <p>
          FRESKO responde por la calidad e idoneidad de sus productos en los términos de la ley. No respondemos por daños derivados de
          información falsa entregada por el usuario, de alergias o restricciones no informadas, ni del uso indebido del sitio. El sitio
          puede tener interrupciones por mantenimiento o fallas técnicas; procuraremos restablecerlo lo antes posible.
        </p>
      </LegalSection>

      <LegalSection id="propiedad" title="13. Propiedad intelectual">
        <p>
          La marca FRESKO, el logo, las fotos, los textos y el diseño del sitio son de su titular o se usan con autorización. No pueden
          usarse sin permiso previo y por escrito.
        </p>
      </LegalSection>

      <LegalSection id="pqrs" title="14. Atención al cliente y PQRS">
        <p>
          Puedes presentar peticiones, quejas, reclamos y sugerencias por los canales indicados en la página de{" "}
          <Link href="/legal/pqrs" className="font-semibold text-[#1F4D36] underline">PQRS</Link>. Respondemos en un máximo de quince (15)
          días hábiles. Si no estás conforme con la respuesta, puedes acudir a la Superintendencia de Industria y Comercio (www.sic.gov.co).
        </p>
      </LegalSection>

      <LegalSection id="cambios" title="15. Cambios a estos términos">
        <p>
          Podemos actualizar estos términos. La versión vigente siempre estará publicada en esta página con su fecha. Si el cambio es
          relevante, te pediremos aceptarlo de nuevo al ingresar; los pedidos ya pagados se rigen por la versión vigente al momento de la compra.
        </p>
      </LegalSection>

      <LegalSection id="ley" title="16. Ley aplicable">
        <p>Estos términos se rigen por las leyes de la República de Colombia.</p>
      </LegalSection>
    </LegalDoc>
  );
}
