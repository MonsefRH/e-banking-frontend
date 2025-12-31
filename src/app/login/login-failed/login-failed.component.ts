import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-login-failed',
  templateUrl: './login-failed.component.html',
  styleUrls: ['./login-failed.component.css']
})
export class LoginFailedComponent implements OnInit {
  errorMessage: string = 'Erreur d\'authentification';
  errorDetails: string = 'Une erreur s\'est produite lors de votre connexion.';
  errorCode: string | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      this.errorCode = params.get('error');
      const description = params.get('error_description');

      if (this.errorCode === 'invalid_grant') {
        this.errorMessage = 'Identifiants invalides';
        this.errorDetails = 'Le nom d\'utilisateur ou le mot de passe est incorrect.';
      } else if (this.errorCode === 'unauthorized') {
        this.errorMessage = 'Accès non autorisé';
        this.errorDetails = 'Vous n\'avez pas la permission d\'accéder à cette application.';
      } else if (this.errorCode === 'timeout') {
        this.errorMessage = 'Connexion expirée';
        this.errorDetails = 'La session a dépassé le délai d\'attente. Veuillez réessayer.';
      } else if (description) {
        this.errorDetails = description;
      }
    });
  }

  goBackToLogin(): void {
    this.router.navigate(['/login']);
  }

  retry(): void {
    this.router.navigate(['/login'], { queryParams: { force: true } });
  }
}