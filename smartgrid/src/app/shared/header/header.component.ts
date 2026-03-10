import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { AuthLegacyService, AppRole } from '../../core/auth-legacy.service';

type NavItem = { label: string; route: string };

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private auth = inject(AuthLegacyService);

  // Hide on landing & login (tweak if needed)
  private hideOnRoutes = ['/', '/login'];
  private currentPath = signal<string>('/');

  private normalize(url: string): string {
    const p = (url || '/').split('#')[0].split('?')[0].replace(/\/+$/, '');
    return p === '' ? '/' : p;
  }
  hideHeader = computed(() => this.hideOnRoutes.includes(this.currentPath()));

  // Order you want them to appear (text-only links)
  private allItems: NavItem[] = [
    { label: 'Dashboard',     route: '/map' },
    { label: 'Feeder',        route: '/feeder' },
    { label: 'Transformers',  route: '/transformers' },
    { label: 'Planner',       route: '/planner' },
    { label: 'Report',        route: '/report' },   // <= your route (not /reports)
    { label: 'Consumer',      route: '/consumer' },
    { label: 'Help',          route: '/help' },
  ];

  role = this.auth.role;

  // Final visible items = filter by the service's getAccessibleRoutes()
  visibleItems = computed<NavItem[]>(() => {
    const r = this.role();
    if (!r) return [];
    const allowed = new Set(this.auth.getAccessibleRoutes(r));
    return this.allItems.filter(i => allowed.has(i.route));
  });

  roleBadge = computed(() => {
    const r = this.role();
    return r ? this.auth.getRoleDisplayName(r) : '—';
  });

  private navSub: any;

  ngOnInit(): void {
    this.currentPath.set(this.normalize(this.router.url));
    this.navSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.currentPath.set(this.normalize(this.router.url)));
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe?.();
  }

// DEV ONLY: quick role switch (remove in prod)
devSetRole(role: AppRole) {
  this.auth.signIn(role, 'dev');
  location.reload();
}

// DEV ONLY: handle change event in TS (safe & typed)
onRoleSelect(e: Event) {
  const el = e.target as HTMLSelectElement | null;
  if (!el) return;
  const val = el.value as AppRole;
  this.devSetRole(val); // you already have devSetRole(role: AppRole)
}

}