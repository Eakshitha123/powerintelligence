// src/app/app.routes.ts
import { Routes } from '@angular/router';

import { LoginComponent } from './pages/login/login';
import { PlannerComponent } from './pages/planner/planner.component';
// If you have placeholders for the other pages, import them too:
import { MapsComponent } from './pages/maps/maps';
import { FeederComponent } from './pages/feeder/feeder';
import { ReportComponent } from './pages/report/report'; 
import { HelpComponent } from './pages/help/help';
import { ConsumerComponent } from './pages/consumer/consumer.component';
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: LoginComponent },

  { path: 'map', component: MapsComponent },
  // { path: 'planner', component: PlannerComponent },
   { path: 'feeder', component: FeederComponent },
  { path: 'consumer', component: ConsumerComponent },
  { path: 'report', component: ReportComponent },
  { path: 'planner', component: PlannerComponent },
  { path: 'help', component: HelpComponent },
  { path: '**', redirectTo: 'login' },

];