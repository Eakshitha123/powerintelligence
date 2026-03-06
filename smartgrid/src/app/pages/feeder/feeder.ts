import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  ElementRef,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Subscription } from 'rxjs';

import { FeederService } from './feeder.service';
import { ChartsService } from './charts.service';
import { ScoringService } from './scoring.service';
import { ExporterService } from './exporter.service';
import { FeederMonthlyRow } from './feeder.types';

@Component({
  selector: 'app-feeder',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './feeder.html',
  styleUrls: ['./feeder.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeederComponent implements OnInit, OnDestroy, AfterViewInit {
  private feederService = inject(FeederService);
  private chartsService = inject(ChartsService);
  private scoring = inject(ScoringService);
  private exporter = inject(ExporterService);

  @ViewChild('feederChartCanvas', { static: false })
  feederChartCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('anomalyChartCanvas', { static: false })
  anomalyChartCanvas?: ElementRef<HTMLCanvasElement>;

  private sub = new Subscription();
  private feederChart: any;
  private anomalyChart: any;

  private viewInitialized = false;

  readonly title = 'Feeder AT&C Risk & Theft Analysis';

  // Signals / state
  readonly data = signal<FeederMonthlyRow[]>([]);
  readonly loading = signal<boolean>(true);
  readonly error = signal<string | null>(null);

  // KPIs
  readonly latest = computed(() => {
    const arr = this.data();
    return arr.length ? arr[arr.length - 1] : undefined;
  });

  readonly lossPercent = computed(() => {
    const l = this.latest();
    if (!l || !l.input_kWh) return 0;
    const loss = l.input_kWh - l.billed_kWh;
    return +(((loss / l.input_kWh) * 100).toFixed(2));
  });

  readonly prevLossPercent = computed(() => {
    const arr = this.data();
    if (arr.length < 2) return 0;
    const prev = arr[arr.length - 2];
    const loss = prev.input_kWh - prev.billed_kWh;
    return +(((loss / prev.input_kWh) * 100).toFixed(2));
  });

  readonly lossTrend = computed(() => {
    const prev = this.prevLossPercent();
    const curr = this.lossPercent();
    const dir = prev > curr ? 'down' : 'up';
    const delta = Math.abs(+((prev - curr).toFixed(1)));
    return { dir, delta };
  });

  feederRiskValue = 0;
  feederRiskLabel = '';

  ngOnInit(): void {
    const s = this.feederService.getFeederMonthlyData().subscribe({
      next: (rows) => {
        this.data.set(rows);
        this.loading.set(false);
        this.error.set(null);
        this.calculateRisk();
        this.tryInitCharts(); // run only when view + data are both ready
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.message ?? 'Failed to load feeder data');
      },
    });
    this.sub.add(s);
  }

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    this.tryInitCharts(); // if data already loaded, charts will init now
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    this.chartsService.destroyChart(this.feederChart);
    this.chartsService.destroyChart(this.anomalyChart);
  }

  private calculateRisk() {
    const s = this.feederService.getFeederScore().subscribe((scoreObj) => {
      this.feederRiskValue = this.scoring.feederRisk(scoreObj);
      this.feederRiskLabel = this.scoring.getRiskLabel(this.feederRiskValue);
    });
    this.sub.add(s);
  }

  /**
   * Initialize charts only when:
   * - the view is initialized (canvas exists in DOM)
   * - data is available
   * - canvas references are present
   */
  private tryInitCharts() {
    if (!this.viewInitialized) return;
    if (!this.data().length) return;
    if (!this.feederChartCanvas?.nativeElement || !this.anomalyChartCanvas?.nativeElement) return;
    this.initCharts();
  }

  private initCharts() {
    // Destroy old charts if any
    this.chartsService.destroyChart(this.feederChart);
    this.chartsService.destroyChart(this.anomalyChart);

    const rows = this.data();
    if (!rows.length) return;

    const labels = rows.map((d) => this.formatMonthYear(d.period));
    const inputData = rows.map((d) => d.input_kWh / 1_000_000);   // kWh -> MWh
    const billedData = rows.map((d) => d.billed_kWh / 1_000_000); // kWh -> MWh
    const lossData = rows.map((d) =>
      +(((d.input_kWh - d.billed_kWh) / d.input_kWh) * 100).toFixed(1)
    );

    this.feederChart = this.chartsService.initBarChart(
      this.feederChartCanvas!.nativeElement,
      labels,
      inputData,
      billedData,
      lossData
    );

    // Mock Loss Index trend (like your original)
    const anomalyData = rows.map((_, i) => 50 + Math.random() * 30 + (i > 6 ? 15 : 0));
    this.anomalyChart = this.chartsService.initLineChart(
      this.anomalyChartCanvas!.nativeElement,
      labels,
      [{ label: 'Loss Index', data: anomalyData } as any],
      'Loss Index (0-100)'
    );
  }

  // Actions
  recalculateScores() {
    console.log('Scores recalculated'); // replace with toast/snackbar if desired
  }

  exportCSV() {
    const filename = this.exporter.getTimestampedFilename('feeder-report', 'csv');
    const headers = ['period', 'input_kWh', 'billed_kWh', 'consumer_count', 'coll_amount_inr'];
    this.exporter.exportCSV(filename, this.data(), headers);
  }

  exportPDF() {
    const filename = this.exporter.getTimestampedFilename('feeder-report', 'pdf');
    this.exporter.exportPDF('feeder-export-card', filename, 'portrait');
  }

  sortTable(col: keyof FeederMonthlyRow | 'loss_percent') {
    const rows = [...this.data()];
    const numericCols = new Set([
      'input_kWh',
      'billed_kWh',
      'consumer_count',
      'coll_amount_inr',
      'loss_percent',
    ]);

    if (col === 'loss_percent') {
      rows.sort((a, b) => this.calcLoss(a) - this.calcLoss(b));
    } else if (numericCols.has(col)) {
      rows.sort((a, b) => +((a as any)[col]) - +((b as any)[col]));
    } else {
      rows.sort((a, b) =>
        String((a as any)[col]).localeCompare(String((b as any)[col]))
      );
    }

    this.data.set(rows);
    this.tryInitCharts(); // re-render charts with new order
  }

  onViewDetails(row: FeederMonthlyRow) {
    alert(`View details for ${this.formatMonthYear(row.period)}`);
  }

  // Helpers used in the template SHOULD be public
  calcLoss(r: FeederMonthlyRow) {
    return +(((r.input_kWh - r.billed_kWh) / r.input_kWh) * 100).toFixed(2);
  }
  formatKWh(v: number) {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)} MWh`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(1)} kWh`;
    return `${v} Wh`;
  }
  formatCurrency(v: number, currency = 'INR') {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(v);
  }
  formatNumber(v: number) {
    return new Intl.NumberFormat('en-IN').format(v);
  }
  formatMonthYear(period: string) {
    const d = period.length === 7 ? new Date(period + '-01') : new Date(period);
    return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  }
}
