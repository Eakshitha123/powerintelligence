import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { ChangeDetectorRef, NgZone } from '@angular/core';

// Globals from the script tags (same as your original page)
declare const Chart: any;
declare const html2canvas: any;
declare const jsPDF: any;

type DT = {
  dt_id: string;
  feeder_id?: string;
  kva_rating?: number;
  lat?: number; lng?: number;
  consumers?: number;
  last_maintenance_date?: string;
};

type ScoreRow = {
  dt_id: string;
  dt_risk?: number;
  top_factors?: string[];
};

type MonthlyRow = {
  dt_id: string;
  month?: string;        // e.g., "2025-12" or "Jan"
  peak_kW?: number;      // used for L/C%
  outage_count?: number; // used for outages chart & 30d number
};

type RowVM = DT & {
  risk: number;
  topFactors: string[];
  outages30d: number;
};

@Component({
  selector: 'app-transformers',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './transformers.component.html',
  styleUrls: ['./transformers.component.css']
})
export class TransformersComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  private zone = inject(NgZone);

  // UI state
  rows: RowVM[] = [];
  isLoading = true;
  selectedDT: RowVM | null = null;
  toast = { visible: false, message: '', type: 'info' as 'success' | 'info' | 'error' };

  // Charts
  private lcChart: any = null;
  private outageChart: any = null;

  // Cached monthly
  private dtMonthlyAll: MonthlyRow[] = [];

  ngOnInit(): void {
    this.loadAll();
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  // ---------------- Data loading & mapping ----------------
  private loadAll(): void {
    this.isLoading = true;

    forkJoin({
      geo: this.http.get<any>('assets/data/geography.json'),
      scores: this.http.get<any>('assets/data/scores.json'),
      ops: this.http.get<any>('assets/data/ops.json'),
      monthly: this.http.get<any>('assets/data/dt_monthly.json')
    }).subscribe({
      next: ({ geo, scores, ops, monthly }) => {
        const transformers: DT[] = Array.isArray(geo?.transformers) ? geo.transformers : [];
        const scoreArr: ScoreRow[] = Array.isArray(scores?.transformers) ? scores.transformers : [];

        // `dt_monthly.json` can be an array or { rows: [...] }
        const monthlyArr: MonthlyRow[] = Array.isArray(monthly)
          ? monthly
          : (Array.isArray(monthly?.rows) ? monthly.rows : []);

        this.dtMonthlyAll = monthlyArr;

        const scoreMap = new Map<string, ScoreRow>(scoreArr.map(s => [String(s.dt_id), s]));

        // "Outages (30d)" = latest monthly outage_count for that DT (same as your page)
        const lastOutageForDT = (dtId: string) => {
          const m = monthlyArr.filter(r => r.dt_id === dtId);
          if (!m.length) return 0;
          return Number(m[m.length - 1].outage_count ?? 0);
        };

        this.rows = transformers.map< RowVM >(dt => {
          const sc = scoreMap.get(dt.dt_id);
          return {
            ...dt,
            risk: Number(sc?.dt_risk ?? 50),
            topFactors: Array.isArray(sc?.top_factors) ? sc!.top_factors! : [],
            outages30d: lastOutageForDT(dt.dt_id)
          };
        }).sort((a, b) => b.risk - a.risk);

        this.isLoading = false;

        // Force first paint in case libs/styles finished after data resolution
        this.zone.run(() => this.cdr.detectChanges());
        // console.log('[TRANSFORMERS] rows loaded:', this.rows.length);
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
        this.showToast('Failed to load transformers data', 'error');
        this.zone.run(() => this.cdr.detectChanges());
      }
    });
  }

  // ---------------- Modal + Charts ----------------
  openDetail(dt: RowVM): void {
    this.selectedDT = dt;
    setTimeout(() => this.drawChartsFor(dt), 0);
    const overlay = document.getElementById('detail-modal') as HTMLElement;
    if (overlay) overlay.style.display = 'flex';
  }

  closeDetail(): void {
    const overlay = document.getElementById('detail-modal') as HTMLElement;
    if (overlay) overlay.style.display = 'none';
    this.destroyCharts();
    this.selectedDT = null;
  }

  onOverlayClick(ev: MouseEvent): void {
    if (ev.target === ev.currentTarget) this.closeDetail();
  }

  private destroyCharts(): void {
    if (this.lcChart?.destroy) this.lcChart.destroy();
    if (this.outageChart?.destroy) this.outageChart.destroy();
    this.lcChart = null;
    this.outageChart = null;
  }

  private drawChartsFor(dt: RowVM): void {
    const monthly = this.dtMonthlyAll.filter(m => m.dt_id === dt.dt_id);

    // Labels
    const labels = monthly.length
      ? monthly.map(m => m.month || '')
      : Array.from({ length: 12 }, (_, i) => `${i + 1}`);

    // L/C % = (peak_kW / (kVA * 0.8)) * 100
    const kva = Number(dt.kva_rating ?? 100);
    const lcSeries = labels.map((_, i) => {
      const pk = Number(monthly[i]?.peak_kW ?? 0);
      const lc = kva ? (pk / (kva * 0.8)) * 100 : 0;
      return Math.max(0, Math.min(100, Math.round(lc)));
    });

    // Outage bars from monthly.outage_count
    const outageSeries = labels.map((_, i) => Number(monthly[i]?.outage_count ?? 0));

    // L/C line chart
    const lcCtx = document.getElementById('lc-chart') as HTMLCanvasElement;
    if (lcCtx && typeof Chart !== 'undefined') {
      this.lcChart = new Chart(lcCtx, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'L/C %',
            data: lcSeries,
            borderColor: 'rgba(51, 191, 166, 1)',
            backgroundColor: 'rgba(51, 191, 166, 0.2)',
            tension: 0.4,
            fill: true,
            pointRadius: 2,
            pointBackgroundColor: 'rgba(51, 191, 166, 1)'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: { legend: { labels: { color: 'rgba(232, 238, 243, 1)', font: { family: 'system-ui, sans-serif', size: 12 } } } },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { color: 'rgba(159, 179, 200, 1)' },
              grid: { color: 'rgba(40, 49, 58, 0.5)' },
              title: { display: true, text: 'Load/Capacity %' }
            },
            x: {
              ticks: { color: 'rgba(159, 179, 200, 1)' },
              grid: { color: 'rgba(40, 49, 58, 0.5)' }
            }
          }
        }
      });
    }

    // Outages bar + loss line (kept stylistically close to your charts.js)
    const outCtx = document.getElementById('outage-chart') as HTMLCanvasElement;
    if (outCtx && typeof Chart !== 'undefined') {
      this.outageChart = new Chart(outCtx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Input (kWh)',
              data: outageSeries,
              backgroundColor: 'rgba(74, 163, 255, 0.6)',
              borderColor: 'rgba(74, 163, 255, 1)',
              borderWidth: 1
            },
            {
              label: 'Billed (kWh)',
              data: Array(labels.length).fill(0),
              backgroundColor: 'rgba(33, 193, 133, 0.6)',
              borderColor: 'rgba(33, 193, 133, 1)',
              borderWidth: 1
            },
            {
              type: 'line',
              label: 'Loss %',
              data: Array(labels.length).fill(0),
              borderColor: 'rgba(255, 90, 95, 1)',
              borderWidth: 2,
              yAxisID: 'y1',
              fill: false,
              tension: 0.4,
              pointRadius: 3,
              pointBackgroundColor: 'rgba(255, 90, 95, 1)'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: { legend: { labels: { color: 'rgba(232, 238, 243, 1)', font: { family: 'system-ui, sans-serif', size: 12 } } } },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { color: 'rgba(159, 179, 200, 1)' },
              grid: { color: 'rgba(40, 49, 58, 0.5)' },
              title: { display: true, text: 'Energy / Count' }
            },
            y1: {
              type: 'linear',
              position: 'right',
              ticks: { color: 'rgba(159, 179, 200, 1)' },
              grid: { drawOnChartArea: false },
              title: { display: true, text: 'Loss %' }
            },
            x: {
              ticks: { color: 'rgba(159, 179, 200, 1)' },
              grid: { color: 'rgba(40, 49, 58, 0.5)' }
            }
          }
        }
      });
    }
  }

  // ---------------- Actions: CSV & PDF ----------------
  exportCSV(): void {
    if (!this.rows?.length) {
      this.showToast('No data to export', 'info');
      return;
    }
    const csv = this.toCSV(
      this.rows.map(r => ({
        dt_id: r.dt_id,
        risk_score: r.risk,
        kva_rating: r.kva_rating ?? '',
        outages_30d: r.outages30d,
        consumers: r.consumers ?? '',
        last_maintenance: r.last_maintenance_date ?? ''
      }))
    );
    this.downloadFile(csv, this.timestamped('dt-ranking', 'csv'), 'text/csv');
    this.showToast('CSV exported', 'success');
  }

  async exportPDF(): Promise<void> {
  try {
    const card = document.getElementById('dt-export-card');
    if (!card) {
      this.showToast('Table card not found', 'error');
      return;
    }

    // --- Resolve globals robustly ---
    const _w = window as any;
    const h2c = _w.html2canvas || (typeof html2canvas !== 'undefined' ? html2canvas : null);
    const jsPDFNS = _w.jspdf || _w.jsPDF || (typeof jsPDF !== 'undefined' ? jsPDF : null);
    const JsPDFCtor = jsPDFNS?.jsPDF || jsPDFNS;  // either window.jspdf.jsPDF or window.jsPDF

    if (!h2c || !JsPDFCtor) {
      console.error('Globals -> html2canvas:', !!h2c, ' jsPDFCtor:', !!JsPDFCtor, ' namespaces:', { jspdf: _w.jspdf, jsPDF: _w.jsPDF });
      this.showToast('PDF libraries not loaded', 'error');
      return;
    }

    this.showToast('Generating PDF...', 'info');

    const canvas = await h2c(card, { backgroundColor: '#0B0E11', scale: 2 });
    const imgW = 210; // A4 width (mm, portrait)
    const imgH = (canvas.height * imgW) / canvas.width;

    const pdf = new JsPDFCtor({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const xOffset = (pdf.internal.pageSize.getWidth() - imgW) / 2;
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', xOffset, 10, imgW, imgH);
    pdf.save(this.timestamped('transformers-report', 'pdf'));

    this.showToast('PDF downloaded', 'success');
  } catch (e) {
    console.error(e);
    this.showToast('PDF export failed', 'error');
  }
}

  // ---------------- Helpers ----------------
  formatDate(d?: string): string {
    if (!d) return '—';
    try {
      const dd = new Date(d);
      return dd.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: '2-digit' });
    } catch { return d; }
  }

  riskClass(score?: number): string {
    const r = Number(score ?? 0);
    if (r < 20) return 'very-low';
    if (r < 40) return 'low';
    if (r < 60) return 'medium';
    if (r < 80) return 'high';
    return 'very-high';
  }

  private toCSV(rows: any[], headers?: string[]): string {
    if (!rows?.length) return '';
    const keys = headers ?? Object.keys(rows[0]);
    const esc = (v: any) => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };
    const head = keys.map(esc).join(',');
    const body = rows.map(r => keys.map(k => esc(r[k])).join(',')).join('\n');
    return `${head}\n${body}`;
  }

  private downloadFile(content: string, filename: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private timestamped(base: string, ext: string): string {
    const now = new Date();
    const ts = now.toISOString().slice(0, 10) + '_' + now.toTimeString().slice(0, 8).replace(/:/g, '');
    return `${base}_${ts}.${ext}`;
  }

  showToast(message: string, type: 'success' | 'info' | 'error') {
    this.toast = { visible: true, message, type };
    setTimeout(() => (this.toast.visible = false), 2000);
  }
}