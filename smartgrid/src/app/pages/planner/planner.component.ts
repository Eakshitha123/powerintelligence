import { Component,ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-planner',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule],
  templateUrl: './planner.component.html',
  styleUrls: ['./planner.component.css'],
})
export class PlannerComponent {
  // purely static demo data for the UI (change as you like)
  title = 'Maintenance Planner';
  subtitle = 'Weekly route overview';
  checklistItems = [
    { id: 'thermal',  label: 'Thermal imaging checks completed' },
    { id: 'lugs',     label: 'Lug connections tight' },
    { id: 'oil',      label: 'Oil level acceptable' },
    { id: 'tap',      label: 'Tap changer position verified' },
    { id: 'bushings', label: 'Bushings intact' },
    { id: 'photos',   label: 'Photos captured' },
  ];
  // local (non-persisted) state
  checklistState: Record<string, boolean> = {};
  workItems = [
    { dt_id: 'DT-1001', priority: 87, consumers: 245, riskLabel: 'risk-high', riskText: 'risk-high', actions: ['Oil top-up', 'Replace lug'] },
    { dt_id: 'DT-1002', priority: 62, consumers: 120, riskLabel: 'risk-medium', riskText: 'risk-medium', actions: ['Inspect bushings'] },
    { dt_id: 'DT-1003', priority: 35, consumers: 80,  riskLabel: 'risk-low', riskText: 'risk-low', actions: [] },
  ];
  route = {
    name: 'South Zone – Week 12',
    distance_km: 42.6,
    eta_min: 185,
    stops: [{ dt_id: 'DT-1001' }, { dt_id: 'DT-1002' }, { dt_id: 'DT-1003' }]
  };

  // tiny helpers for display only
  formatDistance(km: number) { return `${km.toFixed(1)} km`; }
  formatDuration(min: number) {
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    return h > 0 ? `${h}h ${m}m` : `${m} min`;
  }

  // simple reorder (no drag & drop)
  moveUp(i: number) {
    if (i <= 0) return;
    [this.workItems[i - 1], this.workItems[i]] = [this.workItems[i], this.workItems[i - 1]];
  }
  moveDown(i: number) {
    if (i >= this.workItems.length - 1) return;
    [this.workItems[i + 1], this.workItems[i]] = [this.workItems[i], this.workItems[i + 1]];
  }

  onChecklistChange(id: string, checked: boolean) {
    this.checklistState[id] = checked;
    // no persistence since this is a static view now
  }

  optimizeRoute() { alert('Route optimized (demo).'); }
  exportRoute()  { alert('Export route (demo).'); }
  exportCSV()    { alert('Export work orders (demo).'); }
}