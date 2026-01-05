import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Subject, Subscription, of } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import { CoinGeckoService, CryptoPrice } from '@/services/coingecko.service';
import { Chart } from 'chart.js/auto';

interface CryptoHolding {
  symbol: string;
  name: string;
  amount: number;
  value: number;
  change: number;
  currentPrice: number;
}

@Component({
  selector: 'app-crypto',
  templateUrl: './crypto.component.html',
  styleUrls: ['./crypto.component.scss']
})
export class CryptoComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('portfolioChart') portfolioChart!: ElementRef<HTMLCanvasElement>;

  portfolioValue = 0;

  holdings: CryptoHolding[] = [
    { symbol: 'BTC', name: 'Bitcoin', amount: 0.0034, value: 0, change: 0, currentPrice: 0 },
    { symbol: 'ETH', name: 'Ethereum', amount: 0.25, value: 0, change: 0, currentPrice: 0 }
  ];

  marketData: CryptoPrice[] = [];

  selectedCrypto = 'BTC';
  tradeType: 'buy' | 'sell' = 'buy';
  tradeAmount = 100;
  currentPrice = 0;

  isLoadingMarketData = true;
  isLoadingPrices = true;
  lastUpdated: Date | null = null;

  private readonly WATCHED_SYMBOLS = ['BTC', 'ETH', 'BNB', 'ADA', 'SOL', 'XRP'];
  private destroy$ = new Subject<void>();
  private priceSubscription: Subscription = new Subscription();

  // Chart
  private chart?: Chart;

  constructor(
    private coinGeckoService: CoinGeckoService,
    private cdr: ChangeDetectorRef
  ) {}

  /* =========================
     LIFECYCLE
  ========================== */
  ngOnInit(): void {
    this.startRealtimeUpdates();
    this.loadInitialMarketData();
  }

  ngAfterViewInit(): void {
    // Créer le chart seulement après que le canvas existe
    this.createChart();

    // Si des données arrivent avant, on fait un update maintenant
    if (this.marketData.length > 0) {
      this.updateChart(this.marketData);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    this.priceSubscription.unsubscribe();
    this.coinGeckoService.stopPriceUpdates();

    this.chart?.destroy();
  }

  /* =========================
     MARKET DATA
  ========================== */
  private startRealtimeUpdates(): void {
    this.coinGeckoService.startPriceUpdates(this.WATCHED_SYMBOLS, 30000);

    this.priceSubscription = this.coinGeckoService.prices$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: prices => this.handlePriceUpdate(prices),
        error: () => this.handleMarketError()
      });
  }

  private loadInitialMarketData(): void {
    this.isLoadingMarketData = true;

    this.coinGeckoService.getMarketData(this.WATCHED_SYMBOLS)
      .pipe(
        takeUntil(this.destroy$),
        catchError(err => {
          console.error(err);
          this.handleMarketError();
          return of([]);
        })
      )
      .subscribe(prices => this.handlePriceUpdate(prices));
  }

  refreshMarketData(): void {
    this.loadInitialMarketData();
  }

  private handlePriceUpdate(prices: CryptoPrice[]): void {
    if (!prices || prices.length === 0) return;

    this.marketData = prices;

    this.updateHoldingsValues(prices);
    this.updateCurrentPrice();

    // Update chart (si prêt)
    this.updateChart(prices);

    this.lastUpdated = new Date();
    this.isLoadingMarketData = false;
    this.isLoadingPrices = false;

    // Forcer refresh UI (utile si updates hors zone ou cycles)
    this.cdr.detectChanges();
  }

  private handleMarketError(): void {
    this.isLoadingMarketData = false;
    this.showErrorMessage('Erreur lors du chargement des données de marché');
  }

  /* =========================
     PORTFOLIO
  ========================== */
  private updateHoldingsValues(prices: CryptoPrice[]): void {
    this.holdings = this.holdings.map(h => {
      const price = prices.find(p => p.symbol === h.symbol);
      if (!price) return h;

      return {
        ...h,
        name: price.name,
        currentPrice: price.price,
        value: h.amount * price.price,
        change: price.changePercent
      };
    });

    this.calculatePortfolioValue();
  }

  private calculatePortfolioValue(): void {
    this.portfolioValue = this.holdings.reduce((sum, h) => sum + h.value, 0);
  }

  /* =========================
     TRADING
  ========================== */
  onCryptoChange(): void {
    this.updateCurrentPrice();
  }

  private updateCurrentPrice(): void {
    const crypto = this.marketData.find(c => c.symbol === this.selectedCrypto);
    if (crypto) {
      this.currentPrice = crypto.price;
      return;
    }

    this.coinGeckoService.getCoinPrice(this.selectedCrypto)
      .pipe(takeUntil(this.destroy$))
      .subscribe(price => this.currentPrice = price || 0);
  }

  onBuy(): void {
    this.executeTradeFlow('buy');
  }

  onSell(): void {
    this.executeTradeFlow('sell');
  }

  private executeTradeFlow(type: 'buy' | 'sell'): void {
    if (this.tradeAmount <= 0 || this.currentPrice <= 0) {
      this.showErrorMessage('Montant ou prix invalide');
      return;
    }

    const cryptoAmount = this.tradeAmount / this.currentPrice;
    const holding = this.holdings.find(h => h.symbol === this.selectedCrypto);

    if (type === 'sell' && holding && holding.amount < cryptoAmount) {
      this.showErrorMessage('Solde insuffisant');
      return;
    }

    const fees = this.calculateTradingFees(this.tradeAmount);
    const total = type === 'buy' ? this.tradeAmount + fees : this.tradeAmount - fees;

    if (confirm(`Confirmer la transaction\nTotal: ${this.formatCurrency(total)}`)) {
      this.executeTrade(type, cryptoAmount);
    }
  }

  private executeTrade(type: 'buy' | 'sell', amount: number): void {
    alert(`${type === 'buy' ? 'Achat' : 'Vente'} effectué avec succès`);

    const holding = this.holdings.find(h => h.symbol === this.selectedCrypto);

    if (type === 'buy') {
      holding
        ? holding.amount += amount
        : this.holdings.push({
            symbol: this.selectedCrypto,
            name: this.getSelectedCryptoName(),
            amount,
            value: amount * this.currentPrice,
            change: 0,
            currentPrice: this.currentPrice
          });
    } else if (holding) {
      holding.amount -= amount;
    }

    this.calculatePortfolioValue();
  }

  /* =========================
     METHODS REQUIRED BY HTML ✅
  ========================== */
  getPriceTrend(change: number): string {
    if (change > 0) return '↗';
    if (change < 0) return '↘';
    return '→';
  }

  formatPercent(value: number): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  }

  getAvailableCryptos(): CryptoPrice[] {
    return this.marketData.filter(c =>
      ['BTC', 'ETH', 'BNB', 'ADA'].includes(c.symbol)
    );
  }

  getCryptoAmountForTrade(): number {
    return this.currentPrice > 0 ? this.tradeAmount / this.currentPrice : 0;
  }

  /* =========================
     CHART (Chart.js)
  ========================== */
  private createChart(): void {
    if (!this.portfolioChart?.nativeElement) return;
    const ctx = this.portfolioChart.nativeElement.getContext('2d');
    if (!ctx) return;

    // Détruire si déjà existant
    this.chart?.destroy();

    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [{
          label: 'Prix (USD)',
          data: [],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false, // IMPORTANT sinon invisible
        animation: false
      }
    });

    // Fix render initial
    setTimeout(() => this.chart?.resize(), 0);
  }

  private updateChart(prices: CryptoPrice[]): void {
    if (!this.chart) return;

    const top = (prices || []).slice(0, 6);
    this.chart.data.labels = top.map(x => x.symbol);
    this.chart.data.datasets[0].data = top.map(x => x.price);

    this.chart.update();
  }
getAverageChange24h(): number {
  if (!this.marketData?.length) return 0;
  const sum = this.marketData.reduce((acc, c) => acc + (c.changePercent || 0), 0);
  return sum / this.marketData.length;
}
  /* =========================
     HELPERS
  ========================== */
  private calculateTradingFees(amount: number): number {
    return amount * 0.0025;
  }

  private showErrorMessage(message: string): void {
    alert(message);
  }

  private getSelectedCryptoName(): string {
    return this.marketData.find(c => c.symbol === this.selectedCrypto)?.name || this.selectedCrypto;
  }

  getChangeClass(change: number): string {
    return change >= 0 ? 'positive-change' : 'negative-change';
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: value < 1 ? 8 : 2
    }).format(value);
  }

  formatCryptoAmount(amount: number, symbol: string): string {
    const decimals = symbol === 'BTC' ? 8 : symbol === 'ETH' ? 6 : 4;
    return `${amount.toFixed(decimals)} ${symbol}`;
  }

  getLastUpdatedString(): string {
    return this.lastUpdated
      ? `Dernière mise à jour: ${this.lastUpdated.toLocaleTimeString()}`
      : '';
  }
  // ✅ AJOUTS À METTRE DANS crypto.component.ts (SANS TOUCHER LE RESTE)

getBestPerformerSymbol(): string {
  if (!this.marketData?.length) return '—';
  const best = [...this.marketData].sort((a, b) => (b.changePercent || 0) - (a.changePercent || 0))[0];
  return best?.symbol || '—';
}

getBestPerformerChange(): number {
  if (!this.marketData?.length) return 0;
  const best = [...this.marketData].sort((a, b) => (b.changePercent || 0) - (a.changePercent || 0))[0];
  return best?.changePercent || 0;
}

sortMarketBy(mode: 'cap' | 'chg'): void {
  const arr = [...(this.marketData || [])];
  if (mode === 'cap') arr.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));
  if (mode === 'chg') arr.sort((a, b) => (b.changePercent || 0) - (a.changePercent || 0));
  this.marketData = arr;

  // garder le chart à jour après tri
  this.updateChart(this.marketData);
}

}
