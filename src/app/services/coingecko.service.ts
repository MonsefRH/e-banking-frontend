import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, interval, throwError } from 'rxjs';
import { map, catchError, switchMap, retry, timeout } from 'rxjs/operators';
import { of } from 'rxjs';

export interface CoinGeckoMarketData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  last_updated: string;
}

export interface CryptoPrice {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  high24h: number;
  low24h: number;
  volume: number;
  marketCap: number;
  image?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CoinGeckoService {
  private readonly BASE_URL = 'https://api.coingecko.com/api/v3';
  
  // Coin ID mapping (CoinGecko uses different IDs than symbols)
  private readonly COIN_IDS: { [symbol: string]: string } = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum', 
    'BNB': 'binancecoin',
    'ADA': 'cardano',
    'SOL': 'solana',
    'XRP': 'ripple',
    'DOT': 'polkadot',
    'DOGE': 'dogecoin',
    'AVAX': 'avalanche-2',
    'MATIC': 'matic-network'
  };

  // Cache pour les données
  private priceCache = new Map<string, { data: CryptoPrice, timestamp: number }>();
  private readonly CACHE_DURATION = 60000; // 1 minute

  private priceSubject = new BehaviorSubject<CryptoPrice[]>([]);
  public prices$ = this.priceSubject.asObservable();

  private updateIntervalSubscription: any = null;

  constructor(private http: HttpClient) {
    console.log('🚀 CoinGeckoService initialized');
  }

  /**
   * Get market data for specified coins
   */
  getMarketData(symbols: string[]): Observable<CryptoPrice[]> {
    const coinIds = symbols
      .map(symbol => this.COIN_IDS[symbol])
      .filter(id => id);
    
    if (coinIds.length === 0) {
      console.warn('⚠️ No valid coin IDs found for symbols:', symbols);
      return of([]);
    }

    const ids = coinIds.join(',');
    
    // Construire l'URL avec tous les paramètres nécessaires
    const url = `${this.BASE_URL}/coins/markets?` +
      `vs_currency=usd&` +
      `ids=${ids}&` +
      `order=market_cap_desc&` +
      `per_page=250&` +
      `page=1&` +
      `sparkline=false&` +
      `price_change_percentage=24h&` +
      `locale=en`;
    
    console.log('📡 Fetching market data from CoinGecko...');
    
    return this.http.get<CoinGeckoMarketData[]>(url).pipe(
      // Retry une fois en cas d'erreur réseau
      retry({
        count: 1,
        delay: 1000,
      }),
      // Timeout après 10 secondes
      timeout(10000),
      // Mapper les données
      map(data => {
        console.log(`✓ Received ${data.length} coins from CoinGecko`);
        return data
          .map(coin => this.mapCoinGeckoToCryptoPrice(coin))
          .filter(cp => cp !== null) as CryptoPrice[];
      }),
      // Gestion des erreurs
      catchError(error => this.handleError('Market Data', error))
    );
  }

  /**
   * Get simple price data (plus léger que getMarketData)
   */
  getSimplePrices(symbols: string[]): Observable<any> {
    const coinIds = symbols
      .map(symbol => this.COIN_IDS[symbol])
      .filter(id => id);
    
    if (coinIds.length === 0) {
      return of({});
    }

    const ids = coinIds.join(',');
    const url = `${this.BASE_URL}/simple/price?` +
      `ids=${ids}&` +
      `vs_currencies=usd&` +
      `include_market_cap=true&` +
      `include_24hr_vol=true&` +
      `include_24hr_change=true`;
    
    console.log('📡 Fetching simple prices from CoinGecko...');
    
    return this.http.get(url).pipe(
      retry({ count: 1, delay: 1000 }),
      timeout(10000),
      map(data => {
        console.log('✓ Received simple prices:', Object.keys(data).length);
        return data;
      }),
      catchError(error => this.handleError('Simple Prices', error))
    );
  }

  /**
   * Get specific coin price (avec cache)
   */
  getCoinPrice(symbol: string): Observable<number> {
    const coinId = this.COIN_IDS[symbol];
    if (!coinId) {
      console.warn(`⚠️ Unknown symbol: ${symbol}`);
      return of(0);
    }

    // Vérifier le cache
    const cached = this.priceCache.get(coinId);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      console.log(`💾 Using cached price for ${symbol}: $${cached.data.price}`);
      return of(cached.data.price);
    }

    const url = `${this.BASE_URL}/simple/price?ids=${coinId}&vs_currencies=usd`;
    
    console.log(`📡 Fetching price for ${symbol}...`);
    
    return this.http.get<any>(url).pipe(
      retry({ count: 1, delay: 1000 }),
      timeout(10000),
      map(data => {
        const price = data[coinId]?.usd || 0;
        console.log(`✓ ${symbol} price: $${price}`);
        
        // Mettre en cache
        if (price > 0) {
          this.priceCache.set(coinId, {
            data: {
              symbol,
              name: symbol,
              price,
              change: 0,
              changePercent: 0,
              high24h: 0,
              low24h: 0,
              volume: 0,
              marketCap: 0
            },
            timestamp: Date.now()
          });
        }
        
        return price;
      }),
      catchError(error => this.handleError(`Price for ${symbol}`, error))
    );
  }

  /**
   * Start periodic price updates
   */
  startPriceUpdates(symbols: string[], intervalMs: number = 30000): void {
    console.log(`🔄 Starting price updates every ${intervalMs}ms for:`, symbols);

    // Initial load
    this.getMarketData(symbols).subscribe(
      prices => {
        this.priceSubject.next(prices);
      },
      error => {
        console.error('❌ Initial load failed:', error);
        this.priceSubject.next([]);
      }
    );

    // Periodic updates
    this.updateIntervalSubscription = interval(intervalMs).pipe(
      switchMap(() => this.getMarketData(symbols))
    ).subscribe(
      prices => {
        this.priceSubject.next(prices);
      },
      error => {
        console.error('❌ Periodic update failed:', error);
      }
    );
  }

  /**
   * Stop price updates
   */
  stopPriceUpdates(): void {
    if (this.updateIntervalSubscription) {
      this.updateIntervalSubscription.unsubscribe();
      console.log('⏹️ Price updates stopped');
    }
  }

  /**
   * Get trending coins
   */
  getTrendingCoins(): Observable<any> {
    const url = `${this.BASE_URL}/search/trending`;
    
    console.log('📡 Fetching trending coins...');
    
    return this.http.get(url).pipe(
      retry({ count: 1, delay: 1000 }),
      timeout(10000),
      catchError(error => this.handleError('Trending Coins', error))
    );
  }

  /**
   * Get global market data
   */
  getGlobalData(): Observable<any> {
    const url = `${this.BASE_URL}/global`;
    
    console.log('📡 Fetching global market data...');
    
    return this.http.get(url).pipe(
      retry({ count: 1, delay: 1000 }),
      timeout(10000),
      catchError(error => this.handleError('Global Data', error))
    );
  }

  /**
   * Clear the price cache
   */
  clearCache(): void {
    this.priceCache.clear();
    console.log('🗑️ Price cache cleared');
  }

  /**
   * Map CoinGecko data to our CryptoPrice interface
   */
  private mapCoinGeckoToCryptoPrice(coin: CoinGeckoMarketData): CryptoPrice | null {
    try {
      if (!coin.current_price || coin.current_price <= 0) {
        console.warn(`⚠️ Invalid price for ${coin.symbol}: ${coin.current_price}`);
        return null;
      }

      return {
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        price: coin.current_price,
        change: coin.price_change_24h || 0,
        changePercent: coin.price_change_percentage_24h || 0,
        high24h: coin.high_24h || 0,
        low24h: coin.low_24h || 0,
        volume: coin.total_volume || 0,
        marketCap: coin.market_cap || 0,
        image: coin.image
      };
    } catch (error) {
      console.error('Error mapping coin data:', coin, error);
      return null;
    }
  }

  /**
   * Get coin ID from symbol
   */
  getCoinId(symbol: string): string {
    return this.COIN_IDS[symbol] || symbol.toLowerCase();
  }

  /**
   * Get all supported symbols
   */
  getSupportedSymbols(): string[] {
    return Object.keys(this.COIN_IDS);
  }

  /**
   * Handle HTTP errors
   */
  private handleError(context: string, error: HttpErrorResponse | any): Observable<any> {
    let errorMessage = '';

    if (error instanceof HttpErrorResponse) {
      if (error.error instanceof ErrorEvent) {
        // Erreur côté client
        errorMessage = `❌ Client Error (${context}): ${error.error.message}`;
      } else {
        // Erreur côté serveur
        errorMessage = `❌ Server Error (${context}): ${error.status} ${error.statusText}`;
        console.error('Response error body:', error.error);
      }
    } else if (error.name === 'TimeoutError') {
      errorMessage = `⏱️ Timeout Error (${context}): Request took too long`;
    } else {
      errorMessage = `❌ Error (${context}): ${error.message || String(error)}`;
    }

    console.error(errorMessage);
    
    // Retourner un observable vide au lieu de lever une erreur
    return of([]);
  }
}