import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface ReportHistory {
  type: string;
  timestamp: string;
  size: string;
  filename: string;
}

interface ReportCard {
  title: string;
  description: string;
  type: string;
}

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './report.html',
  styleUrls: ['./report.css'],
})
export class ReportComponent implements OnInit, OnDestroy {
  reportHistory: ReportHistory[] = [];
  generatingType: string | null = null;
  
  // Auto-refresh properties
  isAutoRefreshEnabled = false;
  autoRefreshInterval = 5; // seconds
  private refreshIntervalId: any;
  lastRefreshTime: string = 'Never';

  reportCards: ReportCard[] = [
    {
      title: 'Feeder Risk Summary',
      description: 'AT&C loss analysis, theft risk drivers, and consumer collection trends',
      type: 'feeder'
    },
    {
      title: 'DT Risk Summary',
      description: 'Transformer risk ranking, maintenance backlog, and outage analysis',
      type: 'dt'
    },
    {
      title: 'Weekly Plan',
      description: 'Prioritized work orders, route details, and field checklists',
      type: 'planner'
    },
    {
      title: 'NILM Aggregates',
      description: 'Anonymized household insights, anomaly rates, and efficiency metrics (per DT)',
      type: 'nilm'
    }
  ];

  ngOnInit(): void {
    this.loadReportHistory();
  }

  loadReportHistory(): void {
    const stored = localStorage.getItem('gridlite.reports');
    if (stored) {
      try {
        this.reportHistory = JSON.parse(stored);
      } catch (e) {
        this.reportHistory = [];
      }
    }
  }

  generateReport(type: string): void {
    if (this.generatingType) return;

    this.generatingType = type;
    this.showToast(`Generating ${type} report...`, 'info');

    const timestamp = new Date().toISOString();
    const filename = this.getTimestampedFilename(`${type}-report`, 'pdf');

    // Simulate report generation
    setTimeout(() => {
      const report: ReportHistory = {
        type,
        timestamp,
        size: `${(Math.round(Math.random() * 2 + 0.5) * 10) / 10} MB`,
        filename
      };

      this.reportHistory.push(report);
      localStorage.setItem('gridlite.reports', JSON.stringify(this.reportHistory));

      this.showToast(`${type} report ready: ${filename}`, 'success');
      this.generatingType = null;
      this.loadReportHistory();
    }, 1500);
  }

  getTimestampedFilename(base: string, ext: string): string {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return `${base}_${yyyy}${mm}${dd}_${hh}${min}${ss}.${ext}`;
  }

  formatDateTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  showToast(message: string, type: 'info' | 'success' | 'error'): void {
    // Simple toast implementation - you can replace with a proper toast service
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // Optional: Create a temporary toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 550px;
      right: 20px;
      padding: 12px 24px;
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
      color: white;
      text-align: left;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      z-index: 10px;
      animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  downloadReport(report: ReportHistory): void {
    alert(`Download functionality for ${report.filename} would be implemented here`);
  }

  getRecentReports(): ReportHistory[] {
    return this.reportHistory.slice(-5).reverse();
  }

  isGenerating(type: string): boolean {
    return this.generatingType === type;
  }

  toggleAutoRefresh(): void {
    this.isAutoRefreshEnabled = !this.isAutoRefreshEnabled;
    
    if (this.isAutoRefreshEnabled) {
      this.startAutoRefresh();
      this.showToast('Auto-refresh enabled', 'success');
    } else {
      this.stopAutoRefresh();
      this.showToast('Auto-refresh disabled', 'info');
    }
  }

  startAutoRefresh(): void {
    // Clear any existing interval
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
    }
    
    // Set up new interval
    this.refreshIntervalId = setInterval(() => {
      this.loadReportHistory();
      this.lastRefreshTime = new Date().toLocaleTimeString();
    }, this.autoRefreshInterval * 1000);
  }

  stopAutoRefresh(): void {
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
    }
  }

  updateRefreshInterval(): void {
    if (this.isAutoRefreshEnabled) {
      this.stopAutoRefresh();
      this.startAutoRefresh();
      this.showToast(`Refresh interval updated to ${this.autoRefreshInterval}s`, 'info');
    }
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }
}
