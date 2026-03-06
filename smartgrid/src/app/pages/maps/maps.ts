import { AfterViewInit, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import * as L from 'leaflet';

type LayerKey = 'feeder' | 'transformers' | 'households' | 'outages' | 'workorders';

interface FeederGeo {
  name: string;
  polygon?: [number, number][];     // [lat, lng]
  geojson?: any;                    // optional GeoJSON Feature
  geometry?: any;                   // optional GeoJSON Geometry
}

interface TransformerGeo {
  dt_id: string;
  lat: number;
  lng: number;
  kva_rating?: number;
  consumers?: number;
}

interface TransformerScore {
  dt_id: string;
  risk: number; // 0..100
  topFactors?: string[];
  kva_rating?: number;
  consumers?: number;
}

interface WorkOrder {
  wo_id: string;
  dt_id: string;
  status: string;
  priority?: string;
}

interface OpsData {
  outages: Array<{
    center_lat: number;
    center_lng: number;
    duration_hours: number;
    consumers_affected: number;
    severity: 'low' | 'medium' | 'high' | string | number; // numeric 0..1 or band
  }>;
  work_orders: WorkOrder[];
}

@Component({
  selector: 'app-maps',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './maps.html',
  styleUrls: ['./maps.css']
})
export class MapsComponent implements AfterViewInit {
  private http = inject(HttpClient);

  map!: L.Map;

  // UI state
  riskFilter: '' | '0' | '20' | '40' | '60' | '80' = '';
  layers = {
    feeder: true,
    transformers: true,
    households: true,
    outages: true,
    workorders: true
  };

  drawerActive = false;
  selectedDT:
    | (TransformerScore & { lat?: number; lng?: number; kva_rating?: number; consumers?: number })
    | null = null;

  toast = { visible: false, message: '', type: 'info' as 'success' | 'info' | 'error' };

  // Layer groups
  private layerGroups: Record<LayerKey, L.LayerGroup> = {
    feeder: L.layerGroup(),
    transformers: L.layerGroup(),
    households: L.layerGroup(),
    outages: L.layerGroup(),
    workorders: L.layerGroup()
  };

  // Data caches
  private feeder: FeederGeo | null = null;
  private transformers: TransformerGeo[] = [];
  private dtScores: TransformerScore[] = [];
  private workOrders: WorkOrder[] = [];
  private dtMarkerIndex = new Map<string, L.Layer>(); // dt_id -> marker layer

  // Floating legend control
  private legendControl?: L.Control;

  // -------------------------
  // LIFECYCLE
  // -------------------------
  ngAfterViewInit(): void {
    console.log('[MAPS] ngAfterViewInit mounted :: pages/maps/maps.ts');
    this.initMap();
    this.loadAllData();
  }

  // -------------------------
  // INIT MAP (+ legend immediately to prove it renders)
  // -------------------------
  private initMap(): void {
    this.map = L.map('map', { zoomControl: true }).setView([12.95, 77.62], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 20,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    // Add layer groups to map (initially visible)
    (Object.keys(this.layerGroups) as LayerKey[]).forEach(k => this.layerGroups[k].addTo(this.map));

    console.log('[LEGEND] adding legend control from initMap()');
    this.addLegendControl(); // add immediately to prove it renders
  }

  // -------------------------
  // DATA LOADER (with logs)
  // -------------------------
  private loadAllData(): void {
    console.log('[MAPS] loadAllData -> starting HTTP requests');

    forkJoin({
      geo: this.http.get<any>('assets/data/geography.json'),
      scores: this.http.get<any>('assets/data/scores.json'),
      ops: this.http.get<any>('assets/data/ops.json')
    }).subscribe({
      next: ({ geo, scores, ops }) => {
        console.log('[MAPS] HTTP OK', {
          geoKeys: Object.keys(geo || {}),
          scoresKeys: Object.keys(scores || {}),
          opsKeys: Object.keys(ops || {}),
          outagesCount: Array.isArray(ops?.outages) ? ops.outages.length : 0,
          transformersCount: Array.isArray(geo?.transformers) ? geo.transformers.length : 0
        });

        // Geography (already in your format)
        this.feeder = geo?.feeder as FeederGeo;
        this.transformers = Array.isArray(geo?.transformers) ? (geo.transformers as TransformerGeo[]) : [];

        // Adapt scores (dt_risk, top_factors -> risk, topFactors)
        this.dtScores = this.adaptScores(scores);

        // Adapt ops: numeric severity -> band, normalize work orders
        const { outages, workOrders } = this.adaptOps(ops);
        this.workOrders = workOrders;

        // Render layers
        this.renderFeeder();
        this.renderTransformers();
        this.renderHouseholdsMock();
        this.renderOutages(outages);
        this.renderWorkOrders();

        // Keep legend (we already added in init, re-add is safe)
        this.addLegendControl();

        // ---- TEMP SMOKE TEST: force one visible outage circle + pin
        // Comment out after you confirm it appears.
        //this._debugSmoke();
      },
      error: (err) => {
        console.error('[MAPS] HTTP error', err);
        this.showToast('Failed to load map data from assets/data/*.json', 'error');
      }
    });
  }

  // -------------------------
  // RENDERING
  // -------------------------
  private renderFeeder(): void {
    if (!this.feeder) return;

    const anyFeeder = this.feeder as any;
    let latlngs: L.LatLngExpression[] | L.LatLngExpression[][] = [];

    if (Array.isArray(anyFeeder.polygon)) {
      latlngs = (anyFeeder.polygon as [number, number][])
        .map(([a, b]) => this.toLatLngPair(a, b));
    } else if (anyFeeder.geojson?.geometry) {
      latlngs = this.geoJsonToLatLngs(anyFeeder.geojson.geometry) as any;
    } else if (anyFeeder.geojson?.type) {
      latlngs = this.geoJsonToLatLngs(anyFeeder.geojson) as any;
    } else if (anyFeeder.geometry?.type) {
      latlngs = this.geoJsonToLatLngs(anyFeeder.geometry) as any;
    } else {
      console.warn('Feeder geometry not recognized:', anyFeeder);
      return;
    }

    if (!latlngs || (Array.isArray(latlngs) && (latlngs as any[]).length === 0)) {
      console.warn('Feeder polygon is empty');
      return;
    }

    // Teal polygon + light fill (screenshot style)
    const poly = L.polygon(latlngs as any, {
      color: '#33BFA6',
      weight: 2.5,
      fillColor: '#33BFA6',
      fillOpacity: 0.10
    });

    poly.bindPopup(`<b>${this.escapeHtml(this.feeder.name)}</b><br/>Feeder boundary`);
    poly.addTo(this.layerGroups.feeder);

    this.map.fitBounds(poly.getBounds(), { padding: [20, 20] });
  }

  private renderTransformers(): void {
    const scoreById = new Map(this.dtScores.map(s => [s.dt_id, s]));

    this.transformers.forEach(t => {
      const [lat, lng] = this.safePoint(t.lat, t.lng);
      const s = scoreById.get(t.dt_id);
      const risk = s?.risk ?? 0;

      // Prominent circle markers with white ring
      const marker = L.circleMarker([lat, lng], {
        radius: 10,
        color: '#ffffff',
        weight: 2,
        fillColor: this.riskColor(risk),
        fillOpacity: 0.95
      });

      marker.bindPopup(`
        <div style="min-width: 180px;">
          <b>${this.escapeHtml(t.dt_id)}</b><br/>
          Risk: <b>${Math.round(risk)}%</b><br/>
          <small>Click for details</small>
        </div>
      `);

      marker.on('click', () => {
        this.selectedDT = {
          dt_id: t.dt_id,
          risk: risk,
          topFactors: s?.topFactors || [],
          kva_rating: s?.kva_rating ?? t.kva_rating ?? 0,
          consumers: s?.consumers ?? t.consumers ?? 0,
          lat, lng
        };
        this.drawerActive = true;
      });

      marker.addTo(this.layerGroups.transformers);
      this.dtMarkerIndex.set(t.dt_id, marker);
    });

    // Keep transformer pins above other vector layers
    if ((this.layerGroups.transformers as any).bringToFront) {
      (this.layerGroups.transformers as any).bringToFront();
    }

    // Close drawer when any popup closes
    this.map.on('popupclose', () => this.closeDrawer());

    this.applyRiskFilter();
  }

  private renderHouseholdsMock(): void {
    // Demo clusters (replace with your anonymized aggregation)
    const clusters = [
      { lat: 12.945, lng: 77.620, count: 42 },
      { lat: 12.955, lng: 77.630, count: 58 }
    ];

    clusters.forEach(c => {
      const [lat, lng] = this.safePoint(c.lat, c.lng);
      const circle = L.circle([lat, lng], {
        radius: 180,
        color: '#52c41a',
        fillColor: '#52c41a',
        fillOpacity: 0.18,
        weight: 1
      }).bindTooltip(`Household cluster: ${c.count}`, { sticky: true });

      circle.addTo(this.layerGroups.households);
    });
  }

private renderOutages(outages: OpsData['outages']): void {
  try {
    // Ensure layer group is on the map
    if (!this.map.hasLayer(this.layerGroups.outages)) {
      this.layerGroups.outages.addTo(this.map);
    }

    const count = Array.isArray(outages) ? outages.length : 0;
    console.log('[OUTAGES] count =', count);

    if (!count) {
      console.warn('[OUTAGES] empty array or undefined');
      return;
    }

    // Distinct colors so overlaps are visible
    const palette = ['#cf1322', '#fa8c16', '#fadb14', '#6f42c1', '#18a3ff'];

    outages.forEach((o, i) => {
      // Robust band conversion (accepts number 0..1 or string)
      const toBand = (sev: any): 'low' | 'medium' | 'high' => {
        if (typeof sev === 'number') {
          if (sev >= 0.8) return 'high';
          if (sev >= 0.6) return 'medium';
          return 'low';
        }
        const s = String(sev || '').toLowerCase();
        return (s === 'high' || s === 'medium' || s === 'low') ? s as any : 'medium';
      };

      const [lat, lng] = this.safePoint(o.center_lat, o.center_lng);
      const band = toBand(o.severity);

      const baseColor =
        band === 'high' ? '#cf1322' :
        band === 'medium' ? '#fa8c16' :
        '#fadb14';

      // Give each outage a unique but related color so overlaps are visible
      const color = palette[i % palette.length] || baseColor;

      // Radius scaling (meters)
      const base = Math.min(1200, Math.max(260, (o.consumers_affected || 80) * 3));
      const radius =
        band === 'high' ? base * 1.4 :
        band === 'medium' ? base * 1.15 : base;

      console.log(
        `[OUTAGE ${i + 1}] lat=${lat}, lng=${lng}, band=${band}, affected=${o.consumers_affected}, radius=${Math.round(radius)}m`
      );

      // 1) Big translucent disc
      const area = L.circle([lat, lng], {
        radius,
        color,
        weight: 1,
        fillColor: color,
        fillOpacity: 0.28,
        dashArray: i % 2 === 0 ? undefined : '6 6' // alternate dashed outline to see overlaps
      });

      // 2) Center amber pin with white ring
      const center = L.circleMarker([lat, lng], {
        radius: 9,
        color: '#ffffff',
        weight: 2,
        fillColor: '#ffb020',
        fillOpacity: 0.95
      });

      const popupHtml = `
        <b>Outage</b><br/>
        Severity: <b>${this.escapeHtml(band)}</b><br/>
        Duration: ${this.formatNumber(o.duration_hours)} hrs<br/>
        Consumers affected: ${this.formatNumber(o.consumers_affected)}
      `;

      area.bindPopup(popupHtml);
      center.bindPopup(popupHtml);

      area.addTo(this.layerGroups.outages);
      center.addTo(this.layerGroups.outages);
    });

    if ((this.layerGroups.outages as any).bringToFront) {
      (this.layerGroups.outages as any).bringToFront();
    }

  } catch (e) {
    console.error('[OUTAGES] render error:', e);
  }
}

  private renderWorkOrders(): void {
    const tById = new Map(this.transformers.map(t => [t.dt_id, t]));

    this.workOrders.forEach(wo => {
      const t = tById.get(wo.dt_id);
      if (!t) return;

      const [lat, lng] = this.safePoint(t.lat, t.lng);

      const open = String(wo.status || '').toUpperCase() === 'OPEN';
      const color = open ? '#FFB020' : '#21C185';
      const iconChar = open ? '📍' : '✓';

      const marker = L.marker([lat, lng], {
        icon: L.divIcon({
          className: 'work-order-marker',
          html: `<div style="
            background-color:${color};
            color:#fff;
            border-radius:50%;
            width:30px;height:30px;
            display:flex;align-items:center;justify-content:center;
            font-size:16px;border:2px solid #fff;
            box-shadow:0 2px 8px rgba(0,0,0,0.25);
          ">${iconChar}</div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
          popupAnchor: [0, -16]
        })
      });

      marker.bindPopup(`
        <b>Work Order:</b> ${this.escapeHtml(wo.wo_id)}<br/>
        DT: <b>${this.escapeHtml(wo.dt_id)}</b><br/>
        Status: ${this.escapeHtml(wo.status)}<br/>
        ${wo.priority ? `Priority: ${this.escapeHtml(wo.priority)}` : ''}
      `);

      marker.addTo(this.layerGroups.workorders);
    });
  }

  /** Floating Leaflet legend control (bottom-left) */
  private addLegendControl(): void {
    if (this.legendControl) {
      try { this.legendControl.remove(); } catch {}
      this.legendControl = undefined;
    }

    const legendHtml = `
      <div class="gl-legend">
        <div class="gl-legend-title">Legend</div>

        <div class="gl-legend-item">
          <span class="gl-swatch" style="background:#1a9850;"></span>
          <span class="gl-label">Very Low Risk (0–10%)</span>
        </div>
        <div class="gl-legend-item">
          <span class="gl-swatch" style="background:#66bd63;"></span>
          <span class="gl-label">Low Risk (10–20%)</span>
        </div>
        <div class="gl-legend-item">
          <span class="gl-swatch" style="background:#fee08b;"></span>
          <span class="gl-label">Medium Risk (20–40%)</span>
        </div>
        <div class="gl-legend-item">
          <span class="gl-swatch" style="background:#fdae61;"></span>
          <span class="gl-label">High Risk (60–80%)</span>
        </div>
        <div class="gl-legend-item">
          <span class="gl-swatch" style="background:#d73027;"></span>
          <span class="gl-label">Very High Risk (80–100%)</span>
        </div>
        <div class="gl-legend-item">
          <span class="gl-swatch" style="background:#7AC7FF;border:1px solid #4AA3FF;"></span>
          <span class="gl-label">Household Clusters (k≥10)</span>
        </div>
        <div class="gl-legend-item">
          <span class="gl-swatch" style="background:#ff5a5f40;border:1px solid #FF5A5F;"></span>
          <span class="gl-label">Outage Heat</span>
        </div>
      </div>
    `;

    // Use Control constructor to avoid typing issues with L.control(...)
    this.legendControl = new (L.Control as any)({ position: 'bottomleft' });
    (this.legendControl as any).onAdd = () => {
      const div = L.DomUtil.create('div', 'leaflet-control gl-legend-host');
      div.innerHTML = legendHtml;
      L.DomEvent.disableClickPropagation(div);
      return div;
    };
    if (this.legendControl) {
      this.legendControl.addTo(this.map);
      console.log('[LEGEND] control added to map');
    }
  }

  // -------------------------
  // UI actions
  // -------------------------
  toggleLayer(key: LayerKey, visible: boolean): void {
    const group = this.layerGroups[key];
    if (!group) return;

    if (visible) {
      group.addTo(this.map);
      if ((group as any).bringToFront) (group as any).bringToFront();
    } else {
      group.removeFrom(this.map);
    }
  }

  applyRiskFilter(): void {
    if (!this.dtScores.length && !this.transformers.length) return;

    const band = this.riskFilter === '' ? null : Number(this.riskFilter);
    const min = band ?? 0;
    const max = band === null ? 100 : (band + 20);

    const scoreById = new Map(this.dtScores.map(s => [s.dt_id, s.risk]));

    this.dtMarkerIndex.forEach((layer, dtId) => {
      const risk = scoreById.get(dtId) ?? 0;
      const match = band === null ? true : (risk >= min && risk < max);

      if (match) layer.addTo(this.layerGroups.transformers);
      else this.layerGroups.transformers.removeLayer(layer);
    });

    if ((this.layerGroups.transformers as any).bringToFront) {
      (this.layerGroups.transformers as any).bringToFront();
    }
  }

  closeDrawer(): void {
    this.drawerActive = false;
    this.selectedDT = null;
  }

  createWorkOrder(): void {
    if (!this.selectedDT) return;
    this.showToast(`Work order created for ${this.selectedDT.dt_id}`, 'success');
  }

  downloadDTReport(): void {
    if (!this.selectedDT) return;
    this.showToast(`PDF report generated for ${this.selectedDT.dt_id}`, 'info');
  }

  // -------------------------
  // Helpers
  // -------------------------
  riskClass(risk?: number): string {
    const r = risk ?? 0;
    if (r < 20) return 'very-low';
    if (r < 40) return 'low';
    if (r < 60) return 'medium';
    if (r < 80) return 'high';
    return 'very-high';
  }

  private riskColor(risk: number): string {
    if (risk < 20) return '#52c41a';  // very low
    if (risk < 40) return '#13c2c2';  // low
    if (risk < 60) return '#fadb14';  // medium
    if (risk < 80) return '#fa8c16';  // high
    return '#cf1322';                 // very high
  }

  formatKVA(v?: number): string {
    const n = Number(v ?? 0);
    return n ? `${n} kVA` : '—';
  }

  formatNumber(v?: number): string {
    const n = Number(v ?? 0);
    return Number.isFinite(n) ? n.toLocaleString() : '—';
  }

  private showToast(message: string, type: 'success' | 'info' | 'error'): void {
    this.toast = { visible: true, message, type };
    setTimeout(() => (this.toast.visible = false), 2200);
  }

  private escapeHtml(s: string): string {
    return (s || '').replace(/[&<>"']/g, (c) => {
      const m: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      };
      return m[c] || c;
    });
  }

  // --- Coord guards & converters (AUTO-FIXES lng/lat vs lat/lng) ---
  private isLat = (x: number) => Number.isFinite(x) && x >= -90 && x <= 90;
  private isLng = (x: number) => Number.isFinite(x) && x >= -180 && x <= 180;

  private toLatLngPair(a: number, b: number): [number, number] {
    if (this.isLng(a) && this.isLat(b) && !this.isLat(a)) return [b, a];
    return [a, b];
  }

  private geoJsonToLatLngs(geometry: any): L.LatLngExpression[] | L.LatLngExpression[][] {
    if (!geometry || !geometry.type || !geometry.coordinates) return [];
    const toLatLng = ([lng, lat]: number[]) => this.toLatLngPair(lng, lat);
    if (geometry.type === 'Polygon') {
      return geometry.coordinates.map((ring: number[][]) => ring.map(toLatLng));
    }
    if (geometry.type === 'MultiPolygon') {
      return geometry.coordinates.map(
        (poly: number[][][]) => poly.map((ring: number[][]) => ring.map(toLatLng))
      );
    }
    return [];
  }

// Safe point for markers/circles
private safePoint(a: number, b: number): [number, number] {
  const aIsLat = this.isLat(a);
  const bIsLng = this.isLng(b);
  const aIsLng = this.isLng(a);
  const bIsLat = this.isLat(b);

  // If clearly [lng, lat] (first is longitude, second is latitude) -> flip
  if (!aIsLat && aIsLng && bIsLat) {
    return [b, a];
  }

  // If clearly [lat, lng] -> keep
  if (aIsLat && bIsLng) {
    return [a, b];
  }

  // Ambiguous fallback: prefer [lat, lng]
  return [a, b];
}

  // ---------- COMPAT HELPERS FOR YOUR OLD JSON SCHEMA ----------
  private adaptScores(scoresRaw: any): TransformerScore[] {
    const arr = Array.isArray(scoresRaw?.transformers) ? scoresRaw.transformers : [];
    const mapped: TransformerScore[] = arr.map((s: any): TransformerScore => ({
      dt_id: String(s.dt_id ?? ''),
      risk: Number(s.dt_risk ?? s.risk ?? 0), // dt_risk -> risk
      topFactors: Array.isArray(s.top_factors)
        ? s.top_factors
        : (Array.isArray(s.topFactors) ? s.topFactors : []),
      kva_rating: s.kva_rating ?? undefined,
      consumers: s.consumers ?? undefined
    }));
    return mapped.filter((x) => x.dt_id.length > 0);
  }

  private adaptOps(opsRaw: any): { outages: OpsData['outages']; workOrders: WorkOrder[] } {
    const outagesRaw = Array.isArray(opsRaw?.outages) ? opsRaw.outages : [];
    const workRaw = Array.isArray(opsRaw?.work_orders) ? opsRaw.work_orders : [];

    const toBand = (sev: any): 'low' | 'medium' | 'high' => {
      if (typeof sev === 'number') {
        if (sev >= 0.8) return 'high';
        if (sev >= 0.6) return 'medium';
        return 'low';
      }
      const s = String(sev || '').toLowerCase();
      if (s === 'high' || s === 'medium' || s === 'low') return s as any;
      return 'medium';
    };

    const outages: OpsData['outages'] = outagesRaw.map((o: any) => ({
      center_lat: Number(o.center_lat ?? o.lat ?? 0),
      center_lng: Number(o.center_lng ?? o.lng ?? 0),
      duration_hours: Number(o.duration_hours ?? o.duration ?? 0),
      consumers_affected: Number(o.consumers_affected ?? 0),
      severity: toBand(o.severity)
    }));

    const workOrders: WorkOrder[] = workRaw.map((wo: any) => ({
      wo_id: String(wo.wo_id ?? wo.id ?? ''),
      dt_id: String(wo.dt_id ?? ''),
      status: String(wo.status ?? 'OPEN'),
      priority: wo.priority != null ? String(wo.priority) : undefined
    }));

    return { outages, workOrders };
  }

  // -------- TEMP smoke test (draws a guaranteed circle + pin) --------
  private _debugSmoke(): void {
    const lat = 12.9555, lng = 77.6284; // a visible point around Domlur
    const area = L.circle([lat, lng], {
      radius: 600,
      color: '#cf1322',
      weight: 1,
      fillColor: '#cf1322',
      fillOpacity: 0.25
    }).addTo(this.layerGroups.outages);
    const center = L.circleMarker([lat, lng], {
      radius: 9, color: '#ffffff', weight: 2, fillColor: '#ffb020', fillOpacity: 0.95
    }).addTo(this.layerGroups.outages);
    if ((this.layerGroups.outages as any).bringToFront) (this.layerGroups.outages as any).bringToFront();
    console.log('[SMOKE] outage test drawn', !!area, !!center);
  }
}