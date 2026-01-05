import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CustomerService } from '@/services/customer.service';
import { AuthService } from '@/services/auth.service';
import { Customer } from '@/model/customer.model';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-account',
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.scss']
})
export class AccountComponent implements OnInit, OnDestroy {
  profileForm!: FormGroup;
  customer!: Customer;
  loading = false;
  saving = false;
  error: string | null = null;
  successMessage: string | null = null;
  email: string = '';
  
  private destroy$ = new Subject<void>();

  // Computed properties
  get totalAccounts(): number {
    return this.customer?.bankAccounts?.length || 0;
  }

  get totalBalance(): number {
    if (!this.customer?.bankAccounts) return 0;
    return this.customer.bankAccounts.reduce((sum, account) => sum + (account.balance || 0), 0);
  }

  get hasAccounts(): boolean {
    return this.totalAccounts > 0;
  }

  get nameErrors(): string[] {
    const errors: string[] = [];
    const nameControl = this.profileForm?.get('name');
    
    if (nameControl?.touched && nameControl?.errors) {
      if (nameControl.errors['required']) {
        errors.push('Le nom est requis');
      }
      if (nameControl.errors['minlength']) {
        errors.push('Le nom doit contenir au moins 2 caractères');
      }
    }
    return errors;
  }

  get emailErrors(): string[] {
    const errors: string[] = [];
    const emailControl = this.profileForm?.get('email');
    
    if (emailControl?.touched && emailControl?.errors) {
      if (emailControl.errors['required']) {
        errors.push('L\'email est requis');
      }
      if (emailControl.errors['email']) {
        errors.push('Format d\'email invalide');
      }
    }
    return errors;
  }

  constructor(
    private fb: FormBuilder,
    private customerService: CustomerService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.initializeComponent();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.profileForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: [''], // ✅ Ajout du contrôle password
      phone: [''],
      address: [''],
      dateInsc: [''],
      iban: [''],
      cin: [''],
      balance: [0]
    });
  }

  private initializeComponent(): void {
    try {
      this.email = this.authService.getUsername();
      
      if (!this.email) {
        this.error = 'Session expirée. Veuillez vous reconnecter.';
        return;
      }

      this.loadCustomerData();
    } catch (error) {
      console.error('Erreur lors de l\'initialisation:', error);
      this.error = 'Erreur d\'initialisation.';
    }
  }

  private loadCustomerData(): void {
    this.loading = true;
    this.error = null;

    this.customerService.getCurrentCustomer(this.email)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (customer) => {
          console.log('✅ Customer loaded:', customer);
          this.customer = customer;
          this.updateFormWithCustomerData(customer);
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading customer:', error);
          
          if (error.status === 404) {
            this.error = 'Client non trouvé.';
          } else if (error.status === 401 || error.status === 403) {
            this.error = 'Session expirée. Veuillez vous reconnecter.';
          } else {
            this.error = 'Impossible de charger les données client. Veuillez réessayer.';
          }
          
          this.loading = false;
        }
      });
  }

  private updateFormWithCustomerData(customer: Customer): void {
    this.profileForm.patchValue({
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      dateInsc: customer.dateInscription || '',
      cin: customer.cin || '',
      // Si vous avez un balance dans votre modèle Customer
      // balance: customer.balance || 0
    });
  }

  onSaveChanges(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.error = null;
    this.successMessage = null;

    const formData = this.profileForm.value;
    
    // this.customerService.updateCustomer(this.email, formData)
    //   .pipe(takeUntil(this.destroy$))
    //   .subscribe({
    //     next: (updatedCustomer) => {
    //       console.log('✅ Customer updated:', updatedCustomer);
    //       this.customer = updatedCustomer;
    //       this.successMessage = 'Profil mis à jour avec succès !';
    //       this.saving = false;
          
    //       // Clear success message after 3 seconds
    //       setTimeout(() => {
    //         this.successMessage = null;
    //       }, 3000);
    //     },
    //     error: (error) => {
    //       console.error('Error updating customer:', error);
    //       this.error = 'Erreur lors de la mise à jour. Veuillez réessayer.';
    //       this.saving = false;
    //     }
    //   });
  }

  onRefresh(): void {
    this.successMessage = null;
    this.loadCustomerData();
  }
}