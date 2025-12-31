import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  errorMessage: string | null = null;
  isLoading: boolean = false;
  keycloakWindowWidth: number = 500;
  keycloakWindowHeight: number = 600;
  private keycloakWindow: Window | null = null;
  private checkTokenInterval: any;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    // Vérifier si utilisateur est déjà connecté
    if (this.authService.isLoggedIn()) {
      const force = this.route.snapshot.queryParamMap.get('force');
      if (force !== 'true') {
        this.redirectByRole();
        return;
      }
    }

    // Vérifier si on revient du callback Keycloak
    const isCallback = this.route.snapshot.queryParamMap.get('callback');
    if (isCallback === 'true') {
      this.handleKeycloakCallback();
    }

    // Vérifier les erreurs
    const error = this.route.snapshot.queryParamMap.get('error');
    if (error) {
      this.errorMessage = 'Erreur lors de la connexion. Veuillez réessayer.';
    }
  }

  ngOnDestroy(): void {
    if (this.checkTokenInterval) {
      clearInterval(this.checkTokenInterval);
    }
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      const { email, password } = this.loginForm.value;

      this.authService.login(email, password).subscribe({
        next: () => {
          this.isLoading = false;
          this.redirectByRole();
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err.error?.message || 'Identifiant ou mot de passe incorrect';
          console.error('Erreur de connexion:', err);
        }
      });
    }
  }

  loginWithKeycloak(): void {
    this.isLoading = true;
    this.errorMessage = null;

  window.location.href = 'http://localhost:8081/auth/login';
  }

  private handleKeycloakCallback(): void {
    // Récupérer les infos utilisateur après le callback
    this.authService.getKeycloakUserInfo().subscribe({
      next: () => {
        this.redirectByRole();
      },
      error: (err) => {
        this.errorMessage = 'Erreur lors du traitement de l\'authentification';
        console.error('Erreur callback:', err);
      }
    });
  }

  private generateState(): string {
    return Math.random().toString(36).substring(7);
  }

  private redirectByRole(): void {
    const roles = this.authService.getRoles();
    if (roles.includes('AGENT')) {
      this.router.navigate(['/agent']);
    } else if (roles.includes('ADMIN')) {
      this.router.navigate(['/admin-dashboard']);
    } else if (roles.includes('CLIENT')) {
      this.router.navigate(['/client-dashboard/home']);
    } else {
      this.errorMessage = 'Rôle non reconnu. Veuillez contacter l\'administrateur.';
    }
  }

  clearError(): void {
    this.errorMessage = null;
  }
}