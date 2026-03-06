import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
 
interface GlossaryItem {
  term: string;
  description: string; // may contain inline <strong> etc.
}
 
interface FaqItem {
  question: string;
  answer: string; // HTML allowed; rendered via [innerHTML]
}
 
@Component({
  selector: 'app-help',
  templateUrl: './help.html',
  styleUrls: ['./help.css'],
  imports: [CommonModule]
})
export class HelpComponent {
  // Keep one open at a time (like original behavior)
  openGlossaryIndex: number | null = null;
  openFaqIndex: number | null = null;
 
  glossary: GlossaryItem[] = [
    {
      term: 'AT&C Loss',
      description:
        '<strong>Aggregate Technical and Commercial Loss.</strong> Percentage of electricity lost between generation/purchase and consumer billing. Includes distribution losses (technical) and theft/billing errors (commercial).'
    },
    {
      term: 'NILM',
      description:
        '<strong>Non-Intrusive Load Monitoring.</strong> Machine learning technique that infers household appliance-level consumption from a smart meter, without separate sensors on each appliance.'
    },
    {
      term: 'Load-to-Capacity (L/C) Ratio',
      description:
        'Peak power demand vs. transformer kVA rating. High L/C (&gt;0.9) indicates overload risk and premature failure. Ideal range: 0.6–0.8.'
    },
    {
      term: 'Decile',
      description:
        'Risk ranking from 0–9, where 0 = lowest risk and 9 = highest risk. Each decile = 10% of the 0–100% risk score range.'
    },
    {
      term: 'Phase Imbalance Proxy',
      description:
        'Metric derived from household NILM data indicating unequal current distribution across three power phases. High values (&gt;0.3) signal load balancing issues.'
    },
    {
      term: 'K-Anonymity',
      description:
        'Privacy-preserving concept: household clusters shown on map only if they contain ≥ k homes (default k=10). Protects consumer identity.'
    },
    {
      term: 'Sigmoid Function',
      description:
        'Mathematical function that normalizes risk factors into 0–100% scale. Ensures scores are comparable and bounded.'
    }
  ];
 
  faqs: FaqItem[] = [
    {
      question: 'What is the difference between utility and consumer views?',
      answer:
        '<p><strong>Utility roles</strong> (Admin, DTCoM, Field, Viewer) see aggregated data for operational planning. <strong>Consumers</strong> see appliance-level private data; utility sees only anonymized cluster statistics.</p>'
    },
    {
      question: 'How is feeder AT&C risk calculated?',
      answer:
        '<p>Weighted combination of loss ratio, billing anomalies, and NILM-derived insights. Applied through sigmoid function to produce 0–100% risk. <a href="/settings">Weights configurable in Settings</a>.</p>'
    },
    {
      question: 'Can I export data for external analysis?',
      answer:
        '<p>Yes. All pages support CSV export. PDF reports available for feeder, DT, planner, and NILM summaries. Files include timestamp.</p>'
    },
    {
      question: 'How do I create a work order?',
      answer:
        '<p>On <a href="/map">Map page</a>, click a DT marker to open detail drawer, then "Create Work Order". Assign to DTCoM or Field team. Track status in <a href="/planner">Planner</a>.</p>'
    },
    {
      question: 'What does the risk score guarantee?',
      answer:
        '<p><strong>It does not guarantee failure or detect every theft.</strong> Scores are probability-based recommendations. Always combine with field inspection and engineering judgment.</p>'
    }
  ];
 
  toggleGlossary(index: number): void {
    this.openGlossaryIndex = this.openGlossaryIndex === index ? null : index;
  }
 
  toggleFaq(index: number): void {
    this.openFaqIndex = this.openFaqIndex === index ? null : index;
  }
 
  trackByIndex(_idx: number): number {
    return _idx;
  }
}
 