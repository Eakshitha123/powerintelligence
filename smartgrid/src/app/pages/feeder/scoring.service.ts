import { Injectable } from '@angular/core';
import { FeederScoreFactors } from './feeder.types';

@Injectable({ providedIn: 'root' })
export class ScoringService {
  sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

  feederRisk(feederScoreObj?: FeederScoreFactors): number {
    if (!feederScoreObj) return 0;

    const {
      loss_ratio_excess = 0.18,
      sudden_billing_drop_z = 1.1,
      seasonal_dev_z = 0.7,
      consumer_vs_billing_gap = 0.5,
      agg_nilm_anomaly_rate = 0.22
    } = feederScoreObj;

    const raw =
      1.2 * loss_ratio_excess +
      1.0 * sudden_billing_drop_z +
      0.8 * seasonal_dev_z +
      0.7 * consumer_vs_billing_gap +
      0.5 * agg_nilm_anomaly_rate;

    return Math.round(100 * this.sigmoid(raw));
  }

  getRiskDecile(score: number): number {
    if (score < 10) return 0;
    if (score < 20) return 1;
    if (score < 30) return 2;
    if (score < 40) return 3;
    if (score < 50) return 4;
    if (score < 60) return 5;
    if (score < 70) return 6;
    if (score < 80) return 7;
    if (score < 90) return 8;
    return 9;
  }

  getRiskLabel(score: number): string {
    if (score < 20) return 'Very Low';
    if (score < 40) return 'Low';
    if (score < 60) return 'Medium';
    if (score < 80) return 'High';
    return 'Very High';
  }

  getRiskColor(score: number): string {
    const colors = [
      'var(--heat-0)', 'var(--heat-0)',
      'var(--heat-1)', 'var(--heat-1)',
      'var(--heat-2)', 'var(--heat-3)',
      'var(--heat-4)', 'var(--heat-4)',
      'var(--heat-5)', 'var(--heat-5)'
    ];
    const decile = this.getRiskDecile(score);
    return colors[decile];
  }

  getRiskClass(score: number): string {
    const decile = this.getRiskDecile(score);
    return `risk-${decile * 10}`;
  }

  formatScore(score: number): string {
    return `${Math.round(score)}%`;
  }

  formatScoreWithLabel(score: number): string {
    const label = this.getRiskLabel(score);
    return `${Math.round(score)}% (${label})`;
  }

  calculateTrend(previousValue: number, currentValue: number) {
    if (!previousValue || previousValue === 0) return { direction: 'neutral', change: 0 };
    const change = ((currentValue - previousValue) / previousValue) * 100;
    const direction = change > 1 ? 'up' : change < -1 ? 'down' : 'neutral';
    return { direction, change: Math.round(Math.abs(change)) };
  }
}