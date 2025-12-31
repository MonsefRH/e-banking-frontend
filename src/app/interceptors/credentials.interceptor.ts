import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
} from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Intercepteur pour envoyer automatiquement les credentials (cookies) avec chaque requête
 * EXCLUSIONS: APIs externes comme CoinGecko qui ne supportent pas les credentials
 */
@Injectable()
export class CredentialsInterceptor implements HttpInterceptor {
  
  // URLs qui ne doivent PAS avoir withCredentials
  private readonly EXTERNAL_APIS = [
    'api.coingecko.com',
    'api.binance.com',
  ];

  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    // Vérifier si c'est une API externe
    const isExternalAPI = this.EXTERNAL_APIS.some(api => 
      request.url.includes(api)
    );

    let processedRequest = request;

    if (!isExternalAPI) {
      // Ajouter withCredentials SEULEMENT pour les APIs internes
      console.log('🔐 Adding credentials to request:', request.url);
      processedRequest = request.clone({
        withCredentials: true,
      });
    } else {
      // Pour les APIs externes, NE PAS ajouter withCredentials
      console.log('🌐 External API (no credentials):', request.url);
      processedRequest = request.clone({
        withCredentials: false,
      });
    }

    return next.handle(processedRequest);
  }
}