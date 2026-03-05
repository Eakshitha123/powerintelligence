export interface FeederMonthlyRow {
  period: string;             // e.g., "2024-01" or ISO date string
  input_kWh: number;
  billed_kWh: number;
  consumer_count: number;
  coll_amount_inr: number;
  peak_kW?: number;
  outage_count?: number;
}

export interface FeederScoreFactors {
  loss_ratio_excess?: number;
  sudden_billing_drop_z?: number;
  seasonal_dev_z?: number;
  consumer_vs_billing_gap?: number;
  agg_nilm_anomaly_rate?: number;
}