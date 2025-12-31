import { Injectable } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router
} from '@angular/router';
import { AuthService } from './services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    // Vérifie si l'utilisateur est connecté
    if (!this.authService.isLoggedIn()) {
      console.warn('User not logged in. Redirecting to login.');
      this.router.navigate(['/login']);
      return false;
    }

    // Vérifie les rôles requis
    const requiredRoles = route.data['roles'] as string[];
    if (requiredRoles && requiredRoles.length > 0) {
      const userRoles = this.authService.getRoles();
      const hasRequiredRole = requiredRoles.some(role =>
        userRoles.includes(role)
      );

      if (!hasRequiredRole) {
        console.warn(
          `User does not have required roles. Required: ${requiredRoles}, User has: ${userRoles}`
        );
        this.router.navigate(['/auth-error'], {
          queryParams: { error: 'access_denied' }
        });
        return false;
      }
    }

    return true;
  }
}