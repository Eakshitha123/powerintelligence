// login.component.ts
import { Component, EventEmitter, Output, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  @Output() login = new EventEmitter<{ email: string; password: string; remember: boolean }>();

  hidePassword = signal(true);
  isSubmitting = signal(false);
  authError = signal<string | null>(null);

  form;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      remember: [true],
    });
  }

  togglePassword(): void {
    this.hidePassword.update((v: boolean) => !v);
  }

  async onSubmit(): Promise<void> {
    this.authError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    // Simulate async login (replace with real service call)
    try {
      await new Promise((res) => setTimeout(res, 800));
      this.login.emit({
        email: this.form.value.email!,
        password: this.form.value.password!,
        remember: !!this.form.value.remember,
      });
      // Optionally reset the form but keep remember-me state
      const remember = !!this.form.value.remember;
      this.form.reset({ email: '', password: '', remember });
    } catch (e: any) {
      this.authError.set('Login failed. Please try again.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  get email() {
    return this.form.get('email');
  }

  get password() {
    return this.form.get('password');
  }
}