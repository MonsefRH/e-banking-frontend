// models/customer.model.ts
// model/customer.model.ts
export interface Customer {
  id: number;
  name: string;
  email: string;
  password?: string;
  phone?: string;
  address?: string;
  cin?: string;
  dateInscription?: string;
  roles?: string[];
  bankAccounts?: BankAccount[]; // ⚠️ Si votre backend ne le retourne pas, c'est normal
}

export interface BankAccount {
  id: string;
  type: string;
  balance: number;
  currency: string;
  status: string;
  createdAt: string;
}

export interface CustomerUpdateRequest {
  name: string;
  email: string;
}

export interface ModifyCustomerRequest {
  name: string;
  email: string;
  passwd?: string;
  balance?: number;
  phone?: string;
  address?: string;
  dateInsc?: string;  // LocalDate serialized as ISO string
  iban?: string;
  roles?: string[];
  cin?: string;
}



