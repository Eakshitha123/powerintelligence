import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';

type NavItem = { label: string; route: string };

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent implements OnInit {
  private router = inject(Router);

  /** Drawer open/close */
  drawerOpen = signal<boolean>(false);
  open() { this.drawerOpen.set(true); }
  close() { this.drawerOpen.set(false); }
  toggle() { this.drawerOpen.update(v => !v); }

  /** Hide hamburger + drawer on these routes */
  private hideOnRoutes = ['/', '/login']; // add/remove as you prefer

  private currentPath = signal<string>('/');
  private normalize(url: string): string {
    const p = (url || '/').split('#')[0].split('?')[0].replace(/\/+$/, '');
    return p === '' ? '/' : p;
  }

  hideHeader = computed(() => {
    const path = this.currentPath();
    const hide = this.hideOnRoutes.includes(path);
    // Debug once if needed:
    // console.log('[HEADER]', { path, drawerOpen: this.drawerOpen(), hide });
    return hide;
  });

  /** TEXT-ONLY nav list (no icons) */
  navItems: NavItem[] = [
    { label: 'Dashboard',     route: '/map' },
    { label: 'Feeder',        route: '/feeder' },
    { label: 'Transformers',  route: '/transformers' },
    { label: 'Planner',       route: '/planner' },
    { label: 'Reports',       route: '/reports' },
    { label: 'Consumer',      route: '/consumer' },
    { label: 'Help',          route: '/help' },
  ];

  ngOnInit(): void {
    this.currentPath.set(this.normalize(this.router.url));
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        this.currentPath.set(this.normalize(this.router.url));
        this.close(); // auto-close on route change
      });
  }
}