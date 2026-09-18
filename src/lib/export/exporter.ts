import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';

/**
 * Generate Excel binary buffer
 */
export function generateExcelBuffer(data: Record<string, any>[], sheetName = 'Compliance Report'): Buffer {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Generate CSV string
 */
export function generateCsvString(data: Record<string, any>[]): string {
  const worksheet = XLSX.utils.json_to_sheet(data);
  return XLSX.utils.sheet_to_csv(worksheet);
}

/**
 * Generate PDF buffer
 */
export function generatePdfBuffer(title: string, columns: string[], rows: (string | number)[][]): Buffer {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('BALAJI GROUPS — CompliCal Statutory Report', 14, 20);

  doc.setFontSize(12);
  doc.setTextColor(100, 116, 139);
  doc.text(title, 14, 30);
  doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, 14, 37);

  // Table Simple Rendering
  let y = 50;
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);

  // Draw Header Row
  const colWidth = Math.floor(180 / columns.length);
  columns.forEach((col, idx) => {
    doc.setFont('helvetica', 'bold');
    doc.text(col.substring(0, 15), 14 + idx * colWidth, y);
  });

  y += 6;
  doc.setDrawColor(226, 232, 240);
  doc.line(14, y, 195, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  rows.slice(0, 35).forEach((row) => {
    if (y > 275) {
      doc.addPage();
      y = 20;
    }
    row.forEach((cell, idx) => {
      const text = String(cell ?? '').substring(0, 15);
      doc.text(text, 14 + idx * colWidth, y);
    });
    y += 7;
  });

  return Buffer.from(doc.output('arraybuffer'));
}
