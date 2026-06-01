import jsPDF from "jspdf";

export interface ReceiptData {
  shopName: string;
  shopAddress?: string;
  shopPhone?: string;
  shopCnpj?: string;
  clientName: string;
  service: string;
  barber: string;
  date: string;
  time: string;
  price: number;
  receiptId: string;
}

export function generateReceiptPDF(d: ReceiptData) {
  const doc = new jsPDF({ unit: "mm", format: "a5" });
  const w = doc.internal.pageSize.getWidth();
  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(d.shopName, w / 2, 18, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  let y = 26;
  if (d.shopAddress) { doc.text(d.shopAddress, w / 2, y, { align: "center" }); y += 5; }
  if (d.shopPhone) { doc.text(`Tel: ${d.shopPhone}`, w / 2, y, { align: "center" }); y += 5; }
  if (d.shopCnpj) { doc.text(`CNPJ: ${d.shopCnpj}`, w / 2, y, { align: "center" }); y += 5; }

  y += 4;
  doc.setLineWidth(0.3);
  doc.line(15, y, w - 15, y);
  y += 8;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("RECIBO DE ATENDIMENTO", w / 2, y, { align: "center" });
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const rows: [string, string][] = [
    ["Recibo nº", d.receiptId.slice(0, 8).toUpperCase()],
    ["Cliente", d.clientName],
    ["Serviço", d.service],
    ["Barbeiro", d.barber],
    ["Data", d.date],
    ["Horário", d.time],
  ];
  rows.forEach(([k, v]) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${k}:`, 18, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(v), 50, y);
    y += 7;
  });

  y += 4;
  doc.line(15, y, w - 15, y);
  y += 10;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Total:", 18, y);
  doc.text(fmt(d.price), w - 18, y, { align: "right" });

  y += 18;
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.text(
    "Este recibo é um comprovante simples de atendimento e não substitui Nota Fiscal.",
    w / 2, y, { align: "center", maxWidth: w - 30 },
  );

  doc.save(`recibo-${d.receiptId.slice(0, 8)}.pdf`);
}
