import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';

interface User {
  username: string;
  token: string;
  roles?: string[];
  firstName?: string;
  lastName?: string;
  email?: string;
}

interface RegisterResponse {
  email: string;
  message: string;
}

interface RegisterRequest {
  email: string;
  password: string;
  role: string;
  name?: string;
  cin?: string;
  address?: string;
  phone?: string;
  agentCode?: string;
  department?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private userSubject = new BehaviorSubject<User | null>(
    this.loadUserFromStorage()
  );
  user$ = this.userSubject.asObservable();

  // Base URL commune via le Gateway
  private readonly authApiUrl = `${environment.apiBaseUrl}/auth`;

  constructor(private http: HttpClient, private router: Router) {}

  private loadUserFromStorage(): User | null {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    if (token && username) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return {
          username,
          token,
          email: payload.email,
          firstName: payload.firstName,
          lastName: payload.lastName,
          roles: payload.roles,
        };
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Récupérer les infos utilisateur depuis Keycloak (appelé après le callback)
   * IMPORTANT: withCredentials=true pour envoyer les cookies de session
   */
  getKeycloakUserInfo(): Observable<any> {
    console.log('📡 Calling /auth/oauth2/user-info with credentials...');
    
    return this.http.get<any>(
      `${this.authApiUrl}/oauth2/user-info`,
      {
        withCredentials: true  // ← CRUCIAL: Envoie les cookies de session
      }
    ).pipe(
      tap((response) => {
        console.log('✓ User info response received:', response);

        // Valider la réponse
        if (!response.token || !response.username) {
          throw new Error('Invalid response: missing token or username');
        }

        // Sauvegarder le token et les infos
        localStorage.setItem('token', response.token);
        localStorage.setItem('username', response.username);
        localStorage.setItem('email', response.email || '');
        
        if (response.firstName) {
          localStorage.setItem('firstName', response.firstName);
        }
        if (response.lastName) {
          localStorage.setItem('lastName', response.lastName);
        }

        // Sauvegarder aussi les rôles
        if (response.roles && Array.isArray(response.roles)) {
          localStorage.setItem('roles', JSON.stringify(response.roles));
        }

        this.userSubject.next({
          username: response.username,
          token: response.token,
          email: response.email,
          firstName: response.firstName,
          lastName: response.lastName,
          roles: response.roles
        });

        console.log('✓ User data saved to localStorage');
      })
    );
  }

  login(email: string, password: string): Observable<User> {
    console.log('🔑 Logging in with email/password...');
    
    return this.http
      .post<User>(
        `${this.authApiUrl}/login`,
        {
          username: email,
          password,
        },
        { withCredentials: true }  // ← Aussi pour le login classique
      )
      .pipe(
        tap((response) => {
          console.log('✓ Login successful');
          localStorage.setItem('token', response.token);
          localStorage.setItem('username', response.username);
          localStorage.setItem('email', response.email || '');
          
          if (response.roles) {
            localStorage.setItem('roles', JSON.stringify(response.roles));
          }
          
          this.userSubject.asObservable();
        })
      );
  }

  // Nouvelle méthode pour l'inscription
  register(request: RegisterRequest): Observable<RegisterResponse> {
    console.log('📝 Registering new user...');
    
    return this.http.post<RegisterResponse>(
      `${this.authApiUrl}/register`,
      request,
      { withCredentials: true }
    ).pipe(
      tap((response) => {
        console.log('✓ Registration successful:', response);
      })
    );
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  public getUsername(): string {
    return localStorage.getItem('username') || 'Anonymous';
  }

  public getEmail(): string {
    return localStorage.getItem('email') || '';
  }

  public getId(): string {
    return localStorage.getItem('id') || 'anonymous';
  }

  logout(): void {
    console.log('🚪 Logging out...');
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('email');
    localStorage.removeItem('id');
    localStorage.removeItem('firstName');
    localStorage.removeItem('lastName');
    localStorage.removeItem('roles');
    this.userSubject.next(null);
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    const token = this.getToken();
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.ceil(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        console.warn('⚠️ Token expired');
        this.logout();
        return false;
      }
      return true;
    } catch (e) {
      console.error('❌ Error checking token:', e);
      this.logout();
      return false;
    }
  }

  getRoles(): string[] {
    // Essayer d'abord depuis localStorage (si disponible)
    const rolesStr = localStorage.getItem('roles');
    if (rolesStr) {
      try {
        return JSON.parse(rolesStr);
      } catch {
        // Continue
      }
    }

    // Sinon extraire du token
    const token = this.getToken();
    if (!token) return [];
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.roles && Array.isArray(payload.roles)) {
        return payload.roles;
      }
      if (payload.realm_access && payload.realm_access.roles) {
        return payload.realm_access.roles;
      }
      return [];
    } catch {
      return [];
    }
  }
}