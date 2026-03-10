// src/app/app.routes.ts
import { Routes } from '@angular/router';

import { HomeComponent } from './pages/home/home';
import { PlannerComponent } from './pages/planner/planner.component';
// If you have placeholders for the other pages, import them too:
import { MapsComponent } from './pages/maps/maps';
import { FeederComponent } from './pages/feeder/feeder';
import { ReportComponent } from './pages/report/report'; 
import { HelpComponent } from './pages/help/help';
import { ConsumerComponent } from './pages/consumer/consumer.component';
import { TransformersComponent } from './pages/transformers/transformers.component';
import { LoginComponent } from './pages/auth/login/login.component';
import { RegisterComponent } from './pages/auth/register/register.component';
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  { path: 'home', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'map', component: MapsComponent },
  { path: 'feeder', component: FeederComponent },
  { path: 'consumer', component: ConsumerComponent },
  { path: 'report', component: ReportComponent },
  { path: 'planner', component: PlannerComponent },
  { path: 'help', component: HelpComponent },
  { path: 'transformers', component: TransformersComponent },
  { path: '**', redirectTo: 'home' },

];