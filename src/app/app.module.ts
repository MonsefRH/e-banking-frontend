import { Router } from '@angular/router';
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HeaderComponent } from './header/header.component';
import { AccountsComponent } from './accounts/accounts.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CustomerAccountsComponent } from './customer-accounts/customer-accounts.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import { SidebarComponent } from './sidebar/sidebar.component';
import { ChatComponent } from './client-features/assistant-ia/chat/chat.component';
import { AuthInterceptor } from './auth.interceptor';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { LoginComponent } from './login/login.component';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';
import { CustomerDashboardComponent } from './customer-dashboard/customer-dashboard.component';
import { RouterModule } from '@angular/router';
import { VirementComponent } from './client-features/virement/virement.component';
import { CryptoComponent } from './client-features/crypto/crypto.component';
import { AccountComponent } from './client-features/account/account.component';
import { HomeComponent } from './client-features/home/home.component';
import { DashbordComponent } from './admin-features/dashbord/dashbord.component';
import { ParametrageComponent } from './admin-features/parametrage/parametrage.component';
import { DevisesComponent } from './admin-features/devises/devises.component';
import { SidebarAdminComponent } from './admin-features/sidebar-admin/sidebar-admin.component';
import { DailyTransactionsComponent } from './admin-features/daily-transactions/daily-transactions.component';
import { AgentComponent } from './agent/agent.component';
import { SidebarAgentComponent } from './agent-feature/sidebar-agent/sidebar-agent.component';
import { AccueilComponent } from './agent-feature/accueil/accueil.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ClientsComponent } from './agent-feature/clients/clients.component'; // si on utilise une barre

import { RechargeComponent } from './client-features/recharge/recharge.component';
import { ClientsAccountsComponent } from './agent-feature/clients-accounts/clients-accounts.component';

import { LoginFailedComponent } from './login/login-failed/login-failed.component';
import { CallbackComponent } from './callback/callback.component';
import { CredentialsInterceptor } from './interceptors/credentials.interceptor';
import { RegistrationComponent } from './registration/registration.component';

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    AccountsComponent,
    CustomerAccountsComponent,
    SidebarComponent,
    ChatComponent,
    LoginComponent,
    LoginFailedComponent,
    AdminDashboardComponent,
    CustomerDashboardComponent,
    VirementComponent,
    HomeComponent,
    DashbordComponent,
    ParametrageComponent,
    DevisesComponent,
    SidebarAdminComponent,
    CryptoComponent,
    DailyTransactionsComponent,
    AgentComponent,
    SidebarAgentComponent,
    AccueilComponent,
    ClientsComponent,
    AccountComponent,
    RechargeComponent,
    ClientsAccountsComponent,
    CallbackComponent,
    RegistrationComponent
  ],
  imports: [

    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    ReactiveFormsModule,
    FormsModule,
    BrowserAnimationsModule,
    MatIconModule,
    MatMenuModule,
    RouterModule,

    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatCardModule,
    MatSelectModule,
    MatButtonModule,
    MatSnackBarModule,
    MatToolbarModule,     //  OPTIONNEL SI UTILISÉ
    MatProgressSpinnerModule,
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: CredentialsInterceptor,
      multi: true,
    },  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  bootstrap: [AppComponent]
})
export class AppModule {}
