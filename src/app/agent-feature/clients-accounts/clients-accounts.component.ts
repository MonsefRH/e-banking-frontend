import { Component, OnInit } from '@angular/core';
import { Account, AccountsService } from '@/services/accounts.service';

@Component({
  selector: 'app-clients-accounts',
  templateUrl: './clients-accounts.component.html',
  styleUrls: ['./clients-accounts.component.css']
})
export class ClientsAccountsComponent implements OnInit {

  accounts: Account[] = []; // Tous les comptes

  constructor(private accountService: AccountsService) {}

  ngOnInit(): void {
    this.loadAccounts();
  }

  loadAccounts(): void {
    this.accountService.getAllAccounts().subscribe({
      next: (data) => {
        this.accounts = data;
        console.log('Comptes chargés :', this.accounts);
      },
      error: (err) => {
        console.error('Erreur chargement comptes', err);
      }
    });
  }

  trackById(index: number, account: Account): string {
    return account.id;
  }
}
