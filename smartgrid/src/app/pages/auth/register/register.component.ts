import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { register } from '../../../core/auth.service';
import { Category, CATEGORY_INFO } from '../../../core/types';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  @Output() goToLogin = new EventEmitter<void>();

  categories: Category[] = [
    'administrator',
    'dt_operations_manager',
    'field_engineer',
    'analyst',
    'household_consumer',
  ];

  CATEGORY_INFO = CATEGORY_INFO;

  error = '';
  success = false;
  loading = false;
  showPassword = false;
  step: 1 | 2 = 1;

  form;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      systemNumber: ['', [Validators.required]],
      category: ['', [Validators.required]],
      place: ['', [Validators.required]],
    });
  }

  get name() {
    return this.form.get('name');
  }

  get email() {
    return this.form.get('email');
  }

  get password() {
    return this.form.get('password');
  }

  get confirmPassword() {
    return this.form.get('confirmPassword');
  }

  get systemNumber() {
    return this.form.get('systemNumber');
  }

  get category() {
    return this.form.get('category');
  }

  get place() {
    return this.form.get('place');
  }

  get passwordValue(): string {
    return this.password?.value || '';
  }

  get confirmPasswordValue(): string {
    return this.confirmPassword?.value || '';
  }

  get selectedCategoryInfo() {
    const category = this.category?.value as Category;
    return category ? CATEGORY_INFO[category] : null;
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  validateStep1(): string | null {
    const name = this.name?.value?.trim() || '';
    const email = this.email?.value?.trim() || '';
    const password = this.password?.value || '';
    const confirmPassword = this.confirmPassword?.value || '';

    if (!name) return 'Please enter your full name.';
    if (!email) return 'Please enter your email address.';
    if (this.email?.invalid) return 'Please enter a valid email address.';
    if (!password) return 'Please create a password.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    return null;
  }

  handleNext(): void {
    const err = this.validateStep1();
    if (err) {
      this.error = err;
      this.name?.markAsTouched();
      this.email?.markAsTouched();
      this.password?.markAsTouched();
      this.confirmPassword?.markAsTouched();
      return;
    }

    this.error = '';
    this.step = 2;
  }

  selectCategory(category: Category): void {
    this.category?.setValue(category);
  }

  goBack(): void {
    this.step = 1;
    this.error = '';
  }

  submit(): void {
    this.error = '';

    const systemNumber = this.systemNumber?.value?.trim() || '';
    const category = this.category?.value as Category;
    const place = this.place?.value?.trim() || '';

    if (!systemNumber) {
      this.error = 'Please enter your unique system number.';
      this.systemNumber?.markAsTouched();
      return;
    }

    if (!category) {
      this.error = 'Please select your category.';
      this.category?.markAsTouched();
      return;
    }

    if (!place) {
      this.error = 'Please enter your location/place.';
      this.place?.markAsTouched();
      return;
    }

    this.loading = true;

    setTimeout(() => {
      const result = register({
        name: this.name?.value?.trim() || '',
        email: this.email?.value?.trim() || '',
        password: this.password?.value || '',
        systemNumber,
        category,
        place,
      });

      if (result.success) {
        this.success = true;
      } else {
        this.error = result.error || 'Registration failed.';
      }

      this.loading = false;
    }, 800);
  }

  passwordStrengthClass(index: number): string {
    const password = this.passwordValue;

    if (password.length >= index * 3) {
      if (password.length >= 12) return 'strength-strong';
      if (password.length >= 8) return 'strength-medium';
      return 'strength-weak';
    }

    return 'strength-empty';
  }

  passwordsMatch(): boolean {
    return !!this.confirmPasswordValue && this.confirmPasswordValue === this.passwordValue;
  }

  passwordsDoNotMatch(): boolean {
    return !!this.confirmPasswordValue && this.confirmPasswordValue !== this.passwordValue;
  }

  onGoToLogin(): void {
    this.goToLogin.emit();
  }
}