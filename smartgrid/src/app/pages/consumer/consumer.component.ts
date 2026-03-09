import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Import Chart.js directly
import Chart from 'chart.js/auto';

// ⬇️ RELATIVE import (no alias needed)
import { consumerHousehold, consumerTariffs } from '../../core/consumer-data';

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
export class ConsumerComponent implements OnInit, AfterViewInit, OnDestroy {
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
  private hourlyChart: Chart | null = null;
  private applianceChart: Chart | null = null;

  // Tips
  tips = [
    { icon: '☀', title: 'Peak Hours', text: 'Run AC & water heater after 10pm to save ₹120/month on ToD rates' },
    { icon: '❄', title: 'Fridge', text: 'Your fridge is always-on. Setting temp to 3°C instead of 2°C saves ₹60/month' },
    { icon: '🧺', title: 'Washing Machine', text: 'Shift to off-peak hours (midnight-6am) for ₹85/month savings' }
  ];

  // Toast
  toast = { visible: false, message: '', type: 'info' as 'success' | 'info' | 'error' };

  constructor() {}

  ngOnInit(): void {
    // 1) Read static bundle immediately
    this.household = consumerHousehold as Household;
    this.tariffs = consumerTariffs;

    // 2) Compute KPIs instantly
    this.computeUI();
  }

  ngAfterViewInit(): void {
    // 3) Draw charts after view is rendered
    this.safeDrawCharts();
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  // ---------- Charts ----------
  private safeDrawCharts(): void {
    const hourlyEl = this.hourlyCanvas?.nativeElement;
    const donutEl = this.applianceCanvas?.nativeElement;

    if (!hourlyEl || !donutEl) {
      setTimeout(() => this.safeDrawCharts(), 100);
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
    const labels = hourlyAll.map(h => this.timeHHMM(h.ts));
    const data = hourlyAll.map(h => Number(h.kW ?? 0));

    const donutLabels = (this.household.appliance_split_kWh ?? []).map(a => a.appliance);
    const donutData = (this.household.appliance_split_kWh ?? []).map(a => Number(a.kWh ?? 0));

    // Chart 1 — Hourly line chart
    if (labels.length && data.length) {
      this.hourlyChart = new Chart(hourlyEl, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Power (kW)',
            data,
            borderColor: '#2dd4bf',
            backgroundColor: 'rgba(45, 212, 191, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: '#2dd4bf',
            pointBorderColor: '#fff',
            pointBorderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              labels: {
                color: '#f1f5f9',
                font: { family: 'system-ui, sans-serif', size: 13, weight: 'bold' }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { color: '#94a3b8' },
              grid: { color: 'rgba(71, 85, 105, 0.3)' },
              title: { display: true, text: 'Power (kW)', color: '#f1f5f9' }
            },
            x: {
              ticks: { color: '#94a3b8' },
              grid: { color: 'rgba(71, 85, 105, 0.3)' }
            }
          }
        }
      });
    }

    // Chart 2 — Appliance doughnut
    if (donutLabels.length && donutData.length) {
      const colors = [
        '#2dd4bf',
        '#60a5fa',
        '#f59e0b',
        '#ef4444',
        '#10b981',
        '#8b5cf6'
      ];

      this.applianceChart = new Chart(donutEl, {
        type: 'doughnut',
        data: {
          labels: donutLabels,
          datasets: [{
            data: donutData,
            backgroundColor: colors.slice(0, donutLabels.length),
            borderColor: '#1e293b',
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
                color: '#f1f5f9',
                font: { family: 'system-ui, sans-serif', size: 12 },
                padding: 20
              }
            }
          }
        }
      });
    }
  }

  private destroyCharts(): void {
    if (this.hourlyChart) {
      this.hourlyChart.destroy();
      this.hourlyChart = null;
    }
    if (this.applianceChart) {
      this.applianceChart.destroy();
      this.applianceChart = null;
    }
  }

  // ---------- UI Helpers ----------
  private computeUI(): void {
    if (!this.household) return;
    this.kpiConsumption = this.formatKWh(this.household.last_30d_consumption_kWh);
    this.kpiBillForecast = this.formatCurrency(this.household.forecast_month_bill_inr);
    this.kpiToDSavings = this.formatCurrency(240);
    this.kpiAlertCount = String(this.household.nilm_events?.length ?? 0);
  }

  private formatCurrency(value: number, currency = '₹'): string {
    if (value === null || value === undefined) return '—';
    return `${currency} ${Math.round(value).toLocaleString('en-IN')}`;
  }

  private formatKWh(kwh: number): string {
    if (kwh === null || kwh === undefined) return '—';
    if (kwh >= 1_000_000) return `${(kwh / 1_000_000).toFixed(2)} MWh`;
    if (kwh >= 1_000) return `${(kwh / 1_000).toFixed(2)} MWh`;
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

  // ---------- File Exports ----------
  acknowledgeAlert(idx: number): void {
    if (!this.household?.nilm_events) return;
    const ev = this.household.nilm_events[idx];
    if (ev) ev._ack = true;
  }

  exportHourlyCSV(): void {
    if (!this.household?.hourly_profile_sample?.length) {
      this.showToast('No hourly data to export', 'info');
      return;
    }

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
    a.download = `hourly-profile_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showToast('Hourly CSV exported', 'success');
  }

  exportBillPDF(): void {
    this.showToast('Bill PDF exported', 'info');
  }

  // ---------- Helpers ----------
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
