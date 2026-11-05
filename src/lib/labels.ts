import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";

/** Etiqueta de la bolsa de un pedido. */
export type BagLabel = {
  code: string;
  stop: number | null;
  courier: string | null;
  zone: string;
  dateLabel: string;
  slotLabel: string;
  customer: string;
  phone: string;
  address: string;
  details: string;
  notes: string;
  items: { quantity: number; name: string; options: string }[];
  allergens: string;
  qrUrl: string;
};

const MM = 72 / 25.4;
const INK = rgb(0.07, 0.15, 0.11);
const MUTED = rgb(0.38, 0.4, 0.38);
const LINE = rgb(0.78, 0.81, 0.78);

/** Las fuentes estándar del PDF solo tienen caracteres latinos (WinAnsi): se limpia el resto. */
function clean(text: string) {
  return text
    .normalize("NFC")
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, "...")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "")
    .trim();
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number, maxLines: number) {
  const words = clean(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  let cut = false;
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) line = next;
    else {
      if (line) lines.push(line);
      line = w;
      if (lines.length === maxLines) {
        cut = true;
        break;
      }
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (cut || words.join(" ").length > lines.join(" ").length) {
    let last = lines[maxLines - 1] ?? "";
    while (last && font.widthOfTextAtSize(`${last}...`, size) > maxWidth) last = last.slice(0, -1);
    if (lines.length === maxLines) lines[maxLines - 1] = `${last}...`;
  }
  return lines;
}

/** PDF con una etiqueta por pedido (por defecto 4 × 6 pulgadas, vertical). */
export async function buildBagLabelsPdf(labels: BagLabel[], size = "102x152") {
  const [wMm, hMm] = size.split("x").map(Number);
  const W = (wMm || 102) * MM;
  const H = (hMm || 152) * MM;
  const pdf = await PDFDocument.create();
  pdf.setTitle("Etiquetas de pedidos FRESKO");
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const m = 5 * MM;
  const inner = W - m * 2;

  for (const l of labels) {
    const page: PDFPage = pdf.addPage([W, H]);
    const draw = (s: string, x: number, y: number, size: number, font: PDFFont, color = INK) => page.drawText(clean(s), { x, y, size, font, color });
    const hr = (y: number) => page.drawLine({ start: { x: m, y }, end: { x: W - m, y }, thickness: 0.8, color: LINE });
    let y = H - m;

    // Encabezado: consecutivo y parada
    const stopBox = 22 * MM;
    page.drawRectangle({ x: W - m - stopBox, y: y - stopBox, width: stopBox, height: stopBox, color: INK });
    const stopText = l.stop ? String(l.stop) : "-";
    page.drawText("PARADA", { x: W - m - stopBox + (stopBox - bold.widthOfTextAtSize("PARADA", 7)) / 2, y: y - 9, size: 7, font: bold, color: rgb(1, 1, 1) });
    page.drawText(stopText, { x: W - m - stopBox + (stopBox - bold.widthOfTextAtSize(stopText, 30)) / 2, y: y - stopBox + 12, size: 30, font: bold, color: rgb(1, 1, 1) });
    draw("FRESKO", m, y - 9, 8, bold, MUTED);
    draw(l.code, m, y - 34, 26, bold);
    draw(`${l.dateLabel} · ${l.slotLabel}`, m, y - 48, 9, regular, MUTED);
    y -= stopBox + 8;
    draw([l.zone, l.courier ? `Domiciliario: ${l.courier}` : ""].filter(Boolean).join(" · "), m, y, 8.5, regular, MUTED);
    y -= 8;
    hr(y);

    // Cliente y dirección
    y -= 18;
    draw(wrap(l.customer, bold, 15, inner, 1)[0] ?? "", m, y, 15, bold);
    if (l.phone) {
      y -= 16;
      draw(l.phone, m, y, 12, regular);
    }
    y -= 4;
    for (const line of wrap(l.address, bold, 12, inner, 2)) {
      y -= 15;
      draw(line, m, y, 12, bold);
    }
    for (const line of wrap(l.details, regular, 10, inner, 2)) {
      y -= 13;
      draw(line, m, y, 10, regular);
    }
    if (l.notes) {
      y -= 8;
      const noteLines = wrap(`Nota: ${l.notes}`, bold, 9.5, inner - 10, 2);
      const boxH = noteLines.length * 12 + 8;
      page.drawRectangle({ x: m, y: y - boxH, width: inner, height: boxH, color: rgb(1, 0.96, 0.85) });
      noteLines.forEach((line, i) => draw(line, m + 5, y - 13 - i * 12, 9.5, bold));
      y -= boxH;
    }

    // Platos
    y -= 12;
    hr(y);
    const total = l.items.reduce((s, i) => s + i.quantity, 0);
    y -= 16;
    draw(`${total} ${total === 1 ? "plato" : "platos"}`, m, y, 12, bold);
    const qrSize = 26 * MM;
    const bottomLimit = m + qrSize + 14;
    let shown = 0;
    for (const it of l.items) {
      if (y - 26 < bottomLimit) break;
      y -= 15;
      draw(`${it.quantity}x`, m, y, 11, bold);
      draw(wrap(it.name, regular, 11, inner - 22, 1)[0] ?? "", m + 22, y, 11, regular);
      if (it.options) {
        for (const line of wrap(it.options, regular, 8, inner - 22, 2)) {
          y -= 10;
          draw(line, m + 22, y, 8, regular, MUTED);
        }
      }
      shown++;
    }
    if (shown < l.items.length) {
      y -= 13;
      draw(`+ ${l.items.length - shown} más (ver pedido)`, m + 22, y, 9, bold, MUTED);
    }
    if (l.allergens) {
      y -= 15;
      draw(wrap(`Alérgenos: ${l.allergens}`, bold, 8.5, inner, 1)[0] ?? "", m, y, 8.5, bold);
    }

    // Pie: QR
    const png = await QRCode.toBuffer(l.qrUrl, { margin: 0, width: 300, errorCorrectionLevel: "M" });
    const qr = await pdf.embedPng(png);
    hr(m + qrSize + 6);
    page.drawImage(qr, { x: W - m - qrSize, y: m, width: qrSize, height: qrSize });
    draw("Escanea para ver el pedido", m, m + qrSize - 10, 8, regular, MUTED);
    draw(l.code, m, m + qrSize - 26, 14, bold);
  }
  return pdf.save();
}
