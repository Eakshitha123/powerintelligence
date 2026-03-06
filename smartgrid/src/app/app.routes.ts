// src/app/app.routes.ts
import { Routes } from '@angular/router';

import { LoginComponent } from './pages/login/login';
import { MapsComponent } from './pages/maps/maps';
import { FeederComponent } from './pages/feeder/feeder';
import { TransformersComponent } from './pages/transformers/transformers.component';
import { ConsumerComponent } from './pages/consumer/consumer.component'; // 👈 ADD THIS

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: LoginComponent },

  { path: 'map', component: MapsComponent },
  { path: 'feeder', component: FeederComponent },
  { path: 'transformers', component: TransformersComponent },
  { path: 'consumer', component: ConsumerComponent }, // 👈 works now

  { path: '**', redirectTo: 'login' },
];