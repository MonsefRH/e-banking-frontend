import { Component, OnInit } from '@angular/core';  // Added OnInit
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-registration',
  templateUrl: './registration.component.html',
  styleUrls: ['./registration.component.css']
})
export class RegistrationComponent implements OnInit {  
  registrationForm!: FormGroup;
  errorMessage: string | null = null;
  isLoading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {  // Moved form initialization here
    this.registrationForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      name: ['', Validators.required],
      cin: ['', Validators.required],
      address: ['', Validators.required],
      phone: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.registrationForm.valid) {
      this.isLoading = true;
      const formValue = this.registrationForm.value;
      const request = {
        email: formValue.email,
        password: formValue.password,
        role: 'CUSTOMER',
        name: formValue.name,
        cin: formValue.cin,
        address: formValue.address,
        phone: formValue.phone
      };

      this.authService.register(request).subscribe({
        next: (response) => {
          this.isLoading = false;
          console.log('✓ Registration successful', response);
          this.router.navigate(['/login']);  // Redirige vers login après succès
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err.error?.message || 'Erreur lors de l\'inscription';
          console.error('❌ Registration error:', err);
        }
      });
    }
  }

  clearError(): void {
    this.errorMessage = null;
  }
}