import { Injectable } from '@angular/core';
import { Chart, registerables, ChartDataset } from 'chart.js';

/** Register Chart.js components once */
Chart.register(...registerables);

@Injectable({ providedIn: 'root' })
export class ChartsService {
  initBarChart(
    canvas: HTMLCanvasElement,
    labels: string[],
    inputData: number[],
    billedData: number[],
    lossData: (number | string)[]
  ) {
    return new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Input (MWh)',
            data: inputData,
            backgroundColor: 'rgba(74, 163, 255, 0.6)',
            borderColor: 'rgba(74, 163, 255, 1)',
            borderWidth: 1
          },
          {
            label: 'Billed (MWh)',
            data: billedData,
            backgroundColor: 'rgba(33, 193, 133, 0.6)',
            borderColor: 'rgba(33, 193, 133, 1)',
            borderWidth: 1
          },
          {
            type: 'line',
            label: 'Loss %',
            data: lossData,
            borderColor: 'rgba(255, 90, 95, 1)',
            borderWidth: 2,
            yAxisID: 'y1',
            fill: false,
            tension: 0.4,
            pointRadius: 3,
            pointBackgroundColor: 'rgba(255, 90, 95, 1)'
          }
        ] as ChartDataset<'bar' | 'line'>[]
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
            title: { display: true, text: 'Energy (MWh)' }
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

  initLineChart(
    canvas: HTMLCanvasElement,
    labels: string[],
    datasets: ChartDataset<'line'>[],
    yAxisLabel = ''
  ) {
    const colors = [
      'rgba(51, 191, 166, 1)',
      'rgba(74, 163, 255, 1)',
      'rgba(255, 176, 32, 1)',
      'rgba(255, 90, 95, 1)',
      'rgba(33, 193, 133, 1)'
    ];

    const chartDatasets = datasets.map((ds, i) => ({
      ...ds,
      borderColor: colors[i % colors.length],
      backgroundColor: (colors[i % colors.length] as string).replace('1)', '0.1)'),
      tension: 0.4,
      fill: false,
      pointRadius: 3,
      pointBackgroundColor: colors[i % colors.length]
    }));

    return new Chart(canvas, {
      type: 'line',
      data: { labels, datasets: chartDatasets },
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
            title: { display: true, text: yAxisLabel }
          },
          x: {
            ticks: { color: 'rgba(159, 179, 200, 1)' },
            grid: { color: 'rgba(40, 49, 58, 0.5)' }
          }
        }
      }
    });
  }

  destroyChart(chart?: Chart | null) {
    if (chart && typeof (chart as any).destroy === 'function') {
      (chart as any).destroy();
    }
  }
}