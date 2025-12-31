import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-callback',
  template: `
    <div class="min-h-screen relative flex items-center justify-center overflow-hidden">
      <!-- Video Background -->
      <video 
        class="absolute top-0 left-0 w-full h-full object-cover" 
        autoplay 
        loop 
        muted 
        playsinline
      >
        <source src="assets/videos/vd_back.mp4" type="video/mp4">
        Your browser does not support the video tag.
      </video>

      <!-- Blurred Overlay -->
      <div class="absolute top-0 left-0 w-full h-full bg-black bg-opacity-50 backdrop-blur-sm"></div>

      <!-- Loading Card -->
      <div class="relative bg-white bg-opacity-95 p-8 rounded-lg shadow-2xl w-full max-w-md z-10 text-center">
        <div *ngIf="isLoading" class="animate-fadeIn">
          <div class="flex justify-center mb-6">
            <div class="animate-spin">
              <svg class="w-16 h-16 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
            </div>
          </div>
          <h2 class="text-2xl font-bold text-gray-800 mb-2">Connexion en cours...</h2>
          <p class="text-gray-600">Veuillez patienter pendant que nous vous connectons</p>
        </div>

        <!-- Error Card -->
        <div *ngIf="!isLoading && errorMessage" class="animate-slideDown">
          <div class="flex justify-center mb-6">
            <div class="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
              <svg class="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
          </div>
          <h2 class="text-2xl font-bold text-gray-800 mb-2">Erreur de connexion</h2>
          <p class="text-gray-600 mb-6">{{ errorMessage }}</p>

          <div class="space-y-3">
            <button
              type="button"
              (click)="retryLogin()"
              class="w-full bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200"
            >
              Réessayer
            </button>
            <button
              type="button"
              (click)="goToLogin()"
              class="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-md font-medium hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition duration-200"
            >
              Retour à la connexion
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }

    .animate-fadeIn {
      animation: fadeIn 0.5s ease-out;
    }

    .animate-slideDown {
      animation: slideDown 0.3s ease-out;
    }

    .animate-spin {
      animation: spin 1s linear infinite;
    }
  `]
})
export class CallbackComponent implements OnInit {
  isLoading: boolean = true;
  errorMessage: string | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    console.log('🔄 Callback component initialized');
    this.handleCallback();
  }

  private handleCallback(): void {
    console.log('📡 Fetching user info from backend...');

    this.authService.getKeycloakUserInfo()
      .pipe(
        finalize(() => {
          this.isLoading = false;
        }),
        catchError(err => {
          console.error('❌ Error fetching user info:', err);
          console.error('Status:', err.status);
          console.error('Message:', err.error?.message);
          
          this.errorMessage = err.error?.message || 
            'Une erreur est survenue lors de la connexion. Veuillez réessayer.';
          
          return of(null);
        })
      )
      .subscribe(user => {
        if (user) {
          console.log('✓ User info received:', user);
          this.redirectByRole(user.roles || []);
        } else if (!this.errorMessage) {
          this.errorMessage = 'Impossible de récupérer les informations utilisateur.';
        }
      });
  }

  private redirectByRole(roles: string[]): void {
    console.log('🔐 Redirecting by role:', roles);
    
    if (roles.includes('AGENT')) {
      console.log('→ Redirecting to /agent');
      this.router.navigate(['/agent']);
    } else if (roles.includes('ADMIN')) {
      console.log('→ Redirecting to /admin-dashboard');
      this.router.navigate(['/admin-dashboard']);
    } else if (roles.includes('CLIENT') || roles.includes('CUSTOMER') || roles.length === 0) {
      console.log('→ Redirecting to /client-dashboard/home');
      this.router.navigate(['/client-dashboard/home']);
    } else {
      console.log('❌ Unknown role');
      this.errorMessage = 'Rôle non reconnu: ' + roles.join(', ') + '. Veuillez contacter l\'administrateur.';
    }
  }

  retryLogin(): void {
    console.log('🔄 Retrying login...');
    this.isLoading = true;
    this.errorMessage = null;
    this.handleCallback();
  }

  goToLogin(): void {
    console.log('← Going back to login');
    this.router.navigate(['/login']);
  }
}