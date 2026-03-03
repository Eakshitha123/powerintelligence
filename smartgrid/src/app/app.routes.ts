
// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login';
// If you have placeholders for the other pages, import them too:
// import { MapComponent } from './pages/map/map.component'; etc.

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: LoginComponent },

  // Temporary placeholders so navigation works:
  // { path: 'map', component: MapComponent },
  // { path: 'planner', component: PlannerComponent },
  // { path: 'feeder', component: FeederComponent },
  // { path: 'consumer', component: ConsumerComponent },

  { path: '**', redirectTo: 'login' },
];

