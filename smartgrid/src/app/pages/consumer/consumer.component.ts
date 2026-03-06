import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// ⬇️ RELATIVE import (no alias needed)
import { consumerHousehold, consumerTariffs } from '../../core/consumer-data';

// Chart.js global via index.html (or switch to dynamic import in ensureChartLoaded)
declare const Chart: any;

type HourlySample = { ts: string; kW: number };
type ApplianceSplit = { appliance: string; kWh: number };
type Appliance = { name: string; watt: number };
type NilmEvent = {
  appliance: string;
  event: string;
  ts: string;
  duration_min: number;
  estimated_cost_inr: number;
  _ack?: boolean;
};
type Household = {
  last_30d_consumption_kWh: number;
  forecast_month_bill_inr: number;
  hourly_profile_sample: HourlySample[];
  appliance_split_kWh: ApplianceSplit[];
  appliances: Appliance[];
  nilm_events: NilmEvent[];
};

@Component({
  selector: 'app-consumer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './consumer.component.html',
  styleUrls: ['./consumer.component.css']
})
export class ConsumerComponent implements OnInit, OnDestroy {
  constructor() {}
  // ---- Add these 3 methods inside the class ----

acknowledgeAlert(idx: number): void {
  if (!this.household || !this.household.nilm_events) return;
  const ev = this.household.nilm_events[idx];
  if (!ev) return;
  ev._ack = true; // mark as acknowledged in UI
}

exportHourlyCSV(): void {
  if (!this.household?.hourly_profile_sample?.length) {
    this.showToast('No hourly data to export', 'info');
    return;
  }

  // Minimal CSV export inline (no other helpers needed)
  const rows = this.household.hourly_profile_sample.map(h => ({
    timestamp: h.ts,
    power_kW: h.kW
  }));
  const keys = Object.keys(rows[0]);
  const esc = (v: any) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return (s.includes(',') || s.includes('"') || s.includes('\n')) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = keys.map(esc).join(',');
  const body = rows.map(r => keys.map(k => esc((r as any)[k])).join(',')).join('\n');
  const csv = `${header}\n${body}`;

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hourly-profile_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  this.showToast('Hourly CSV exported', 'success');
}

exportBillPDF(): void {
  // Matches your previous behavior: just show a toast
  this.showToast('Bill PDF exported', 'info');
}
  // Keep canvases always in DOM; only hide via [hidden]
  @ViewChild('hourlyCanvas') hourlyCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('applianceCanvas') applianceCanvas!: ElementRef<HTMLCanvasElement>;

  // Synchronous state (no spinner)
  isLoading = false;
  showCharts = true;
  household: Household | null = null;
  tariffs: any = null;

  // KPIs
  kpiConsumption = '—';
  kpiBillForecast = '—';
  kpiToDSavings = '—';
  kpiAlertCount = '—';

  // Charts
  private hourlyChart: any = null;
  private applianceChart: any = null;

  // Tips (same as original)
  tips = [
    { icon: '☀', title: 'Peak Hours',      text: 'Run AC & water heater after 10pm to save ₹120/month on ToD rates' },
    { icon: '❄', title: 'Fridge',          text: 'Your fridge is always-on. Setting temp to 3°C instead of 2°C saves ₹60/month' },
    { icon: '🧺', title: 'Washing Machine', text: 'Shift to off-peak hours (midnight-6am) for ₹85/month savings' }
  ];

  // Toast
  toast = { visible: false, message: '', type: 'info' as 'success' | 'info' | 'error' };

  ngOnInit(): void {
    // 1) Read static bundle immediately
    this.household = consumerHousehold as Household;
    this.tariffs = consumerTariffs;

    // 2) Compute KPIs instantly
    this.computeUI();

    // 3) Draw charts after first paint (ensures canvases are visible/measured)
    requestAnimationFrame(() => this.safeDrawCharts());
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  // ---------- Charts ----------
  private async ensureChartLoaded(): Promise<any> {
    const g = window as any;
    if (g.Chart) return g.Chart;
    // Fallback via npm if CDN not available:
    // const mod = await import('chart.js/auto');
    // g.Chart = mod.default || mod;
    // return g.Chart;
    return null;
  }

  private async safeDrawCharts(): Promise<void> {
    const hourlyEl = this.hourlyCanvas?.nativeElement;
    const donutEl  = this.applianceCanvas?.nativeElement;
    if (!hourlyEl || !donutEl) {
      // very rare: run one more tick
      setTimeout(() => this.safeDrawCharts(), 0);
      return;
    }

    const ChartCtor = await this.ensureChartLoaded();
    if (!ChartCtor) {
      this.showToast('Chart library not loaded', 'error');
      return;
    }

    this.drawChartsUsingElements(hourlyEl, donutEl);
  }

  private drawChartsUsingElements(hourlyEl: HTMLCanvasElement, donutEl: HTMLCanvasElement): void {
    if (!this.household) return;

    // Destroy previous (HMR)
    this.destroyCharts();

    // Series
    const hourlyAll = this.household.hourly_profile_sample ?? [];
    const labels = hourlyAll.map(h => this.timeHHMM(h.ts)).slice(0, 17);
    const data   = hourlyAll.map(h => Number(h.kW ?? 0)).slice(0, 17);

    const donutLabels = (this.household.appliance_split_kWh ?? []).map(a => a.appliance);
    const donutData   = (this.household.appliance_split_kWh ?? []).map(a => Number(a.kWh ?? 0));

    // Chart 1 — Hourly area
    if (labels.length && data.length) {
      this.hourlyChart = new (window as any).Chart(hourlyEl, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'kW',
            data,
            borderColor: 'rgba(51, 191, 166, 1)',
            backgroundColor: 'rgba(51, 191, 166, 0.2)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 2,
            pointBackgroundColor: 'rgba(51, 191, 166, 1)'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              labels: {
                color: 'rgba(232, 238, 243, 1)',
                font: { family: 'system-ui, sans-serif', size: 12 }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { color: 'rgba(159, 179, 200, 1)' },
              grid: { color: 'rgba(40, 49, 58, 0.5)' },
              title: { display: true, text: 'Power (kW)' }
            },
            x: {
              ticks: { color: 'rgba(159, 179, 200, 1)' },
              grid: { color: 'rgba(40, 49, 58, 0.5)' }
            }
          }
        }
      });
    }

    // Chart 2 — Appliance donut
    if (donutLabels.length && donutData.length) {
      const colors = [
        'rgba(51, 191, 166, 0.8)',
        'rgba(74, 163, 255, 0.8)',
        'rgba(255, 176, 32, 0.8)',
        'rgba(255, 90, 95, 0.8)',
        'rgba(33, 193, 133, 0.8)',
        'rgba(122, 199, 255, 0.8)'
      ];

      this.applianceChart = new (window as any).Chart(donutEl, {
        type: 'doughnut',
        data: {
          labels: donutLabels,
          datasets: [{
            data: donutData,
            backgroundColor: colors.slice(0, donutLabels.length),
            borderColor: 'rgba(18, 22, 26, 1)',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: 'rgba(232, 238, 243, 1)',
                font: { family: 'system-ui, sans-serif', size: 12 },
                padding: 15
              }
            }
          }
        }
      });
    }
  }

  private destroyCharts(): void {
    if (this.hourlyChart?.destroy) this.hourlyChart.destroy();
    if (this.applianceChart?.destroy) this.applianceChart.destroy();
    this.hourlyChart = null;
    this.applianceChart = null;
  }

  // ---------- MISSING helper (now included) ----------
  private computeUI(): void {
    if (!this.household) return;
    this.kpiConsumption = this.formatKWh(this.household.last_30d_consumption_kWh);
    this.kpiBillForecast = this.formatCurrency(this.household.forecast_month_bill_inr);
    this.kpiToDSavings  = this.formatCurrency(240);
    this.kpiAlertCount  = String(this.household.nilm_events?.length ?? 0);
  }

  // ---------- Formatting ----------
  private formatCurrency(value: number, currency = '₹'): string {
    if (value === null || value === undefined) return '—';
    return `${currency} ${Math.round(value).toLocaleString('en-IN')}`;
  }
  private formatKWh(kwh: number): string {
    if (kwh === null || kwh === undefined) return '—';
    if (kwh >= 1_000_000) return `${(kwh / 1_000_000).toFixed(2)} MWh`;
    if (kwh >= 1_000)     return `${(kwh / 1_000).toFixed(2)} MWh`;
    return `${Math.round(kwh)} kWh`;
  }
  formatDateTime(dateStr?: string): string {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-IN', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
    } catch { return '—'; }
  }
  private timeHHMM(ts: string): string {
    try {
      const t = ts.split('T')[1] || '';
      return t.slice(0, 5) || ts;
    } catch { return ts; }
  }

  // ---------- CSV & file helpers ----------
  private toCSV(rows: any[], headers?: string[]): string {
    if (!rows?.length) return '';
    const keys = headers ?? Object.keys(rows[0]);
    const esc = (v: any) => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      return (s.includes(',') || s.includes('"') || s.includes('\n')) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = keys.map(esc).join(',');
    const body = rows.map(r => keys.map(k => esc(r[k])).join(',')).join('\n');
    return `${header}\n${body}`;
  }

  private downloadFile(content: string, filename: string, mime: string): void {
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

  // ---------- Computed helpers ----------
  totalKWh(): number {
    if (!this.household) return 0;
    return Number(this.household.last_30d_consumption_kWh || 0);
  }
  appliancePercent(kwh: number): number {
    const total = this.totalKWh();
    if (!total) return 0;
    return Math.max(0, Math.min(100, (kwh / total) * 100));
  }

  // ---------- Toast ----------
  showToast(message: string, type: 'success' | 'info' | 'error' = 'info') {
    this.toast = { visible: true, message, type };
    setTimeout(() => (this.toast.visible = false), 2200);
  }
}
