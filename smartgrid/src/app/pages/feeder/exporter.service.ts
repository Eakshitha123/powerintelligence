import { Injectable } from '@angular/core';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

@Injectable({ providedIn: 'root' })
export class ExporterService {
  exportCSV(filename: string, rows: any[], headers?: string[]) {
    if (!rows || rows.length === 0) return;

    let csvHeaders = headers;
    if (!csvHeaders && typeof rows[0] === 'object') {
      csvHeaders = Object.keys(rows[0]);
    }

    let csv = '';
    if (csvHeaders) {
      csv += csvHeaders.map(h => this.escapeCSV(h)).join(',') + '\n';
    }

    rows.forEach(row => {
      if (typeof row === 'object') {
        const values = (csvHeaders ?? Object.keys(row)).map(h => this.escapeCSV(row[h as keyof typeof row]));
        csv += values.join(',') + '\n';
      } else {
        csv += this.escapeCSV(row) + '\n';
      }
    });

    this.downloadFile(csv, filename, 'text/csv');
  }

  async exportPDF(elementId: string, filename: string, orientation: 'portrait' | 'landscape' = 'portrait') {
    const element = document.getElementById(elementId);
    if (!element) return;

    const canvas = await html2canvas(element, { backgroundColor: '#0B0E11', scale: 2 });
    const imgWidth = orientation === 'landscape' ? 297 : 210; // A4 mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' });

    const xOffset = (pdf.internal.pageSize.getWidth() - imgWidth) / 2;
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', xOffset, 10, imgWidth, imgHeight);

    // footer
    const pageCount = (pdf as any).internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(159, 179, 200);
      pdf.text(
        `Page ${i} of ${pageCount}`,
        pdf.internal.pageSize.getWidth() / 2,
        pdf.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
      pdf.text(
        `Generated on ${new Date().toLocaleDateString('en-IN')}`,
        pdf.internal.pageSize.getWidth() / 2,
        pdf.internal.pageSize.getHeight() - 5,
        { align: 'center' }
      );
    }

    pdf.save(filename);
  }

  getTimestampedFilename(baseName: string, extension: string) {
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 10) + '_' + now.toTimeString().slice(0, 8).replace(/:/g, '');
    return `${baseName}_${timestamp}.${extension}`;
  }

  private downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = filename;
    document.body.appendChild(link); link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private escapeCSV(value: any) {
    if (value === null || value === undefined) return '';
    const str = value.toString();
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }
}