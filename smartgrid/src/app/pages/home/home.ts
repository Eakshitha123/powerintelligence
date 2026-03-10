import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthLegacyService } from '../../core/auth-legacy.service';

type RoleKey = 'Administrator' | 'DTCoM' | 'Field' | 'Viewer' | 'Consumer';

interface RoleOption {
  key: RoleKey;
  name: string;
  icon: string;
  description: string;
  route: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.html',
  styleUrls: ['./home.css'],
})
export class HomeComponent {
  selectedRole: RoleKey | null = null;
  openFaqIndex: number | null = null;

  roles: RoleOption[] = [
    { key: 'Administrator', name: 'Administrator', icon: '👤', description: 'Full system access, model configuration & thresholds', route: '/map' },
    { key: 'DTCoM',         name: 'DT Operations Manager', icon: '⚙️', description: 'Transformer assets, maintenance & operations', route: '/map' },
    { key: 'Field',         name: 'Field Engineer', icon: '🛠️', description: 'Maintenance scheduling & field execution', route: '/planner' },
    { key: 'Viewer',        name: 'Analyst (Read-Only)', icon: '👁️', description: 'View-only reports, feeders, transformers & analytics', route: '/feeder' },
    { key: 'Consumer',      name: 'Household Consumer', icon: '🏠', description: 'Private usage insights & NILM data view', route: '/consumer' },
  ];

  faqs = [
    { q: 'What is GridLite Local?', a: 'GridLite Local is a front-end energy distribution management platform designed for multi-role collaboration with real-time analytics and asset intelligence.' },
    { q: 'How many user roles are available?', a: '5 roles: Administrator, DT Operations Manager, Field Engineer, Analyst (Viewer), and Household Consumer.' },
    { q: 'Is my data secure and private?', a: 'This demo uses role-based views and runs locally with no backend connections.' },
    { q: 'Can I export reports?', a: 'Yes, CSV and PDF exports can be provided in analytics pages (to be wired in components).' },
    { q: 'Is this a production system?', a: 'No, this is a demo with local/sample data only.' },
  ];

  constructor(
    private router: Router,
    private auth: AuthLegacyService
  ) {}

  scrollTo(el: HTMLElement) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  toggleFaq(index: number) {
    this.openFaqIndex = this.openFaqIndex === index ? null : index;
  }

  onSubmit() {
    if (!this.selectedRole) {
      alert('Please select a role');
      return;
    }

    // Persist selected role for role-based navbar and route access.
    this.auth.signIn(this.selectedRole);

    // Minimal local session (optional)
    const userId = `user-${this.selectedRole}-${Date.now()}`;
    localStorage.setItem('gl_user', JSON.stringify({
      role: this.selectedRole,
      userId,
      signedInAt: Date.now()
    }));

    const route = this.roles.find(r => r.key === this.selectedRole)?.route || '/map';
    setTimeout(() => this.router.navigate([route]), 300);
  }
}