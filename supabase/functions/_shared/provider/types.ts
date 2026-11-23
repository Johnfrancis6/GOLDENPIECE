/**
 * Provider adapter contract (ARCHITECTURE §3.1). The app never talks to a
 * provider: Edge Functions call a ProviderAdapter. Money is bigint here and
 * integer JSON numbers on the wire (shared/schemas/provider_entry.json).
 */
export type InstitutionKind = "bank" | "momo";
export type Scope = "balances" | "transactions";

export interface Capabilities {
  balances: boolean;
  statementHistory: boolean;
  pushNotifications: boolean;
  securityEvents: boolean;
  maxHistoryDays: number;
}

export interface ConsentDescriptor {
  institution: string;
  institution_name: string;
  scopes: Scope[];
  history_days: number;
  simulated: boolean;
}

export interface ProviderAccount {
  providerAccountId: string;
  kind: InstitutionKind;
  institution: string;
  currency: Currency;
  displayName: string;
  iban?: string;
  bic?: string;
  msisdn?: string;
  msisdnMasked?: string;
  historyAvailable: boolean;
}

export interface ProviderBalance {
  accountId: string;
  amountMinor: bigint;
  currency: Currency;
  at: string;
}

export type Currency = "XOF" | "XAF" | "EUR" | "USD";
export type MomoOpType =
  | "cash_in"
  | "cash_out"
  | "p2p_in"
  | "p2p_out"
  | "merchant"
  | "bill"
  | "airtime"
  | "bank_in"
  | "bank_out"
  | "fee"
  | "reversal";

export interface ProviderEntry {
  providerEntryId: string;
  accountId: string;
  status: "BOOK" | "PDNG" | "RJCT";
  creditDebit: "CRDT" | "DBIT";
  amountMinor: bigint;
  currency: Currency;
  bookingTs: string;
  valueDate: string;
  bankTxCode: { domain: string; family: string; subFamily: string };
  endToEndId?: string;
  txId?: string;
  acctSvcrRef?: string;
  counterparty?: { name?: string; iban?: string; msisdn?: string; bic?: string; merchantCode?: string };
  remittanceInfo?: string;
  purposeCode?: string;
  charges?: { amountMinor: bigint; currency: string };
  momo?: {
    operator: string; // ref.operators id
    opType: MomoOpType;
    agentId?: string;
    balanceAfterMinor?: bigint;
    operatorRef: string;
  };
}

export interface ProviderSecurityEvent {
  providerEventId: string;
  type: string; // core.security_events.type, e.g. 'sim_swap'
  at: string;
  details: Record<string, unknown>;
}

export interface ProviderAdapter {
  id: string;
  capabilities(institution: string): Capabilities;
  startLink(
    i: {
      userId: string;
      institution: string;
      scopes: Scope[];
      country?: string;
      options?: Record<string, unknown>;
    },
  ): Promise<{ linkId: string; consent: ConsentDescriptor }>;
  completeLink(i: { userId: string; linkId: string }): Promise<ProviderAccount[]>;
  getBalances(linkId: string, accountIds?: string[]): Promise<ProviderBalance[]>;
  listEntries(
    i: { linkId: string; accountId: string; cursor?: string; bookedFrom?: string; pageSize: number },
  ): Promise<{ entries: ProviderEntry[]; nextCursor?: string }>;
  listSecurityEvents?(i: { linkId: string; since?: string }): Promise<ProviderSecurityEvent[]>;
  handleCallback?(req: Request): Promise<ProviderEntry[]>;
  revokeLink(linkId: string): Promise<void>;
}
