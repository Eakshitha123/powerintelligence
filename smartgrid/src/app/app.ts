import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FooterComponent } from './shared/footer/footer.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, FooterComponent],  // <-- import footer here
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
})
export class AppComponent {
  protected readonly title = signal('smartgrid');
}