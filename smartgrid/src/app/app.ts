import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],          // keep RouterOutlet imported
  templateUrl: './app.html',
  styleUrls: ['./app.css'],         // must be plural (array)
})
export class AppComponent {
  protected readonly title = signal('smartgrid');
}