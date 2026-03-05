import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { FeederMonthlyRow, FeederScoreFactors } from './feeder.types';

@Injectable({ providedIn: 'root' })
export class FeederService {
  private http = inject(HttpClient);

  /** Adjust path to where your JSON is served from. */
  getFeederMonthlyData(): Observable<FeederMonthlyRow[]> {
    return this.http.get<FeederMonthlyRow[]>('/assets/data/feeder_monthly.json').pipe(
      map(rows => rows.sort((a, b) => a.period.localeCompare(b.period))) // ensure chronological
    );
  }

  /**
   * You had ds.getFeederScore() in the old code.
   * Here we return a static/default object. Replace with your real API logic if available.
   */
  getFeederScore(): Observable<FeederScoreFactors> {
    const defaults: FeederScoreFactors = {
      loss_ratio_excess: 0.18,
      sudden_billing_drop_z: 1.1,
      seasonal_dev_z: 0.7,
      consumer_vs_billing_gap: 0.5,
      agg_nilm_anomaly_rate: 0.22
    };
    return new Observable((obs) => { obs.next(defaults); obs.complete(); });
  }
}