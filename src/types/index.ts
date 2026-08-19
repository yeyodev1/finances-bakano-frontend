export type UserRole = 'superadmin' | 'admin' | 'viewer'

export type PaymentMethod =
  | 'transferencia'
  | 'stripe'
  | 'cheque'
  | 'transferencia_o_cheque'
  | 'efectivo'
  | 'no_paga'
  | 'otro'

export type BillingType = 'monthly' | 'no_charge' | 'special'

export type InvoiceStatus = 'pending' | 'partial' | 'paid' | 'overdue' | 'waived' | 'cancelled'

export interface User {
  _id: string
  name: string
  email: string
  role: UserRole
  isActive: boolean
  photoUrl?: string
  lastLoginAt?: string
  receivesNotifications: boolean
  createdAt: string
  updatedAt: string
}

export interface ClientSplit {
  label?: string
  amount: number
  day?: number | null
}

export type ArchiveReason =
  | 'impago'
  | 'cancelacion_cliente'
  | 'cierre_negocio'
  | 'competencia'
  | 'precio'
  | 'insatisfaccion_resultados'
  | 'pausa_temporal'
  | 'fin_contrato'
  | 'decision_bakano'
  | 'reembolso'
  | 'garantia_fallida'
  | 'otro'

export const ARCHIVE_REASON_LABELS: Record<ArchiveReason, string> = {
  impago: 'Impago / mora',
  cancelacion_cliente: 'El cliente canceló el servicio',
  cierre_negocio: 'Cerró el negocio',
  competencia: 'Se fue con la competencia',
  precio: 'Precio',
  insatisfaccion_resultados: 'Insatisfecho con los resultados',
  pausa_temporal: 'Pausa temporal',
  fin_contrato: 'Fin de contrato',
  decision_bakano: 'Decisión de Bakano',
  reembolso: 'Se le devolvió el dinero',
  garantia_fallida: 'Garantía agotada sin resultados',
  otro: 'Otro',
}

// ── Reembolsos ───────────────────────────────────────────────────

export const REFUND_REASONS = [
  'garantia',
  'sin_resultados',
  'servicio_no_prestado',
  'cobro_duplicado',
  'error_de_cobro',
  'acuerdo_comercial',
  'otro',
] as const
export type RefundReason = (typeof REFUND_REASONS)[number]

export const REFUND_REASON_LABELS: Record<RefundReason, string> = {
  garantia: 'Garantía: no hubo resultados',
  sin_resultados: 'Sin resultados',
  servicio_no_prestado: 'Servicio no prestado',
  cobro_duplicado: 'Cobro duplicado',
  error_de_cobro: 'Error en el cobro',
  acuerdo_comercial: 'Acuerdo comercial',
  otro: 'Otro',
}

export interface Refund {
  _id: string
  paymentId?: string | null
  invoiceId?: string | Invoice | null
  clientId: string | Client
  clientName: string
  period: string
  amount: number
  currency: string
  refundedAt: string
  method: PaymentMethod
  reference?: string
  reason: RefundReason
  notes?: string
  receiptUrl?: string
  guaranteeId?: string | null
  /** El reembolso vino con la baja del cliente en el mismo paso. */
  archivedClient: boolean
  registeredByName?: string
  createdAt: string
}

export interface RefundReasonRow {
  reason: RefundReason
  label: string
  count: number
  amount: number
}

export interface RefundSummary {
  count: number
  amount: number
  monthCount: number
  monthAmount: number
  archivedClients: number
  byReason: RefundReasonRow[]
}

// ── Garantías ────────────────────────────────────────────────────
// Política de agencia: al cliente que no vio resultados se le regala el mes
// siguiente. Si aparecen resultados vuelve a cobrarse; si no, se estira un segundo
// mes y, agotado el tope, la garantía se cierra como fracaso.

export const GUARANTEE_STATUSES = [
  'abierta',
  'extendida',
  'cumplida',
  'fallida',
  'cancelada',
] as const
export type GuaranteeStatus = (typeof GUARANTEE_STATUSES)[number]

export const GUARANTEE_STATUS_LABELS: Record<GuaranteeStatus, string> = {
  abierta: 'Primer mes de garantía',
  extendida: 'Segundo mes de garantía',
  cumplida: 'Hubo resultados: vuelve a cobrarse',
  fallida: 'Fracaso: sin resultados en dos meses',
  cancelada: 'Garantía cancelada',
}

export const GUARANTEE_OPEN_STATUSES: GuaranteeStatus[] = ['abierta', 'extendida']

export const GUARANTEE_MAX_CYCLES = 2

export type GuaranteeOutcome = 'cumplida' | 'fallida' | 'cancelada'

export interface GuaranteeCycle {
  cycle: number
  period: string
  invoiceIds: string[]
  waivedAmount: number
  openedAt: string
  resultNotes?: string
  byName?: string
}

export interface Guarantee {
  _id: string
  clientId: string | Client
  clientName: string
  status: GuaranteeStatus
  triggerPeriod: string
  reason?: string
  cycles: GuaranteeCycle[]
  maxCycles: number
  monthlyAmount: number
  openedAt: string
  closedAt?: string | null
  outcomeNotes?: string
  archivedClient: boolean
  refundId?: string | null
  openedByName?: string
  closedByName?: string
  createdAt: string
  updatedAt: string
}

export interface GuaranteeSummary {
  open: number
  firstMonth: number
  secondMonth: number
  recovered: number
  failed: number
  cancelled: number
  /** Cobro mensual que hoy no entra por estar en garantía. */
  waivedMonthly: number
  waivedTotal: number
  /** Cumplidas sobre cerradas, en porcentaje. */
  recoveryRate: number
}

/** Caché de la garantía vigente que viaja dentro del cliente. */
export interface ClientGuarantee {
  status?: GuaranteeStatus | null
  guaranteeId?: string | null
  cycle: number
  period?: string | null
  since?: string | null
}

export interface ClientAttachment {
  name: string
  url: string
  publicId?: string
  mimeType?: string
  size?: number
  uploadedAt: string
}

export interface ClientLifecycleEntry {
  action: 'archived' | 'reactivated'
  reason?: ArchiveReason
  notes?: string
  attachments: ClientAttachment[]
  durationDays?: number
  revenueToDate?: number
  at: string
  byName?: string
}

export interface InvoiceDeferral {
  previousDueDate: string
  newDueDate: string
  reason?: string
  notes?: string
  agreedAt: string
  agreedByName?: string
}

export interface ChurnReasonRow {
  reason: ArchiveReason
  label: string
  count: number
  lostMonthlyAmount: number
  avgLifetimeDays: number
  totalLifetimeRevenue: number
}

export interface ChurnMonthRow {
  /** "YYYY-MM" en hora de Ecuador. */
  month: string
  count: number
  lostMonthlyAmount: number
}

export interface ChurnReport {
  byReason: ChurnReasonRow[]
  /** Bajas agrupadas por mes. Un backend viejo no lo manda. */
  byMonth?: ChurnMonthRow[]
  totals: {
    archivedClients: number
    lostMonthlyAmount: number
    avgLifetimeDays: number
    totalLifetimeRevenue: number
  }
  /** Lo que Bakano invierte en retener antes de perder al cliente. */
  guarantees?: GuaranteeSummary
  /** Lo que se devolvió. */
  refunds?: RefundSummary
  recent: Array<{
    _id: string
    name: string
    archivedAt: string
    reason: ArchiveReason
    label: string
    lifetimeDays: number
    lifetimeRevenue: number
    amount: number
    attachmentsCount: number
  }>
}

export interface ClientCategory {
  _id: string
  name: string
  slug: string
  color?: string
  icon?: string
  description?: string
  isActive: boolean
  clientCount?: number
}

export interface Client {
  _id: string
  name: string
  legalName?: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  amount: number
  currency: string
  issueDay?: number | null
  collectionDay?: number | null
  collectionDayLabel?: string
  paymentMethod: PaymentMethod
  billingType: BillingType
  splits: ClientSplit[]
  notes?: string
  tags: string[]
  workspaceId?: string | null
  workspaceName?: string | null
  /** Usuario que persigue el cobro de este cliente. */
  ownerId?: string | null
  ownerName?: string | null
  /** Rubro del cliente. Las categorías se crean desde la app. */
  categoryId?: string | null
  categoryName?: string | null
  workspaceLinkedAt?: string | null
  /** Imagen del espacio cacheada desde métricas. Úsala como avatar del cliente. */
  workspaceImageUrl?: string | null
  accessOverride?: AccessOverride | null
  shouldBeClosed?: boolean
  overdueAmount?: number
  maxDaysOverdue?: number
  autoDeactivate: boolean
  graceDays?: number | null
  isActive: boolean
  workspaceIsActive?: boolean | null
  deactivatedAt?: string | null
  deactivationReason?: string
  startDate: string
  endDate?: string | null
  /** Primer período "YYYY-MM" a facturar. Para servicios que arrancan más adelante. */
  billingStartPeriod?: string | null

  isArchived: boolean
  archivedAt?: string | null
  archiveReason?: ArchiveReason | null
  archiveNotes?: string
  archiveAttachments: ClientAttachment[]
  lifetimeDays?: number | null
  lifetimeRevenue?: number | null
  lifecycleHistory: ClientLifecycleEntry[]

  /** Garantía vigente. `cycle: 0` = ninguna. */
  guarantee?: ClientGuarantee | null

  stripeCustomerId?: string | null
  createdAt: string
  updatedAt: string
}

export interface Invoice {
  _id: string
  clientId: string | Client
  clientName: string
  period: string
  splitIndex: number
  splitLabel?: string
  amount: number
  currency: string
  paidAmount: number
  issueDate?: string | null
  dueDate: string
  originalDueDate?: string | null
  deferrals: InvoiceDeferral[]
  isAdvance: boolean
  paidAt?: string | null
  /** Devuelto sobre este cobro. No se resta de `paidAmount`: el neto es la diferencia. */
  refundedAmount?: number
  refundedAt?: string | null
  /** Mes regalado por garantía: se emite condonado. */
  isGuarantee?: boolean
  guaranteeId?: string | null
  status: InvoiceStatus
  notes?: string
  autoGenerated: boolean
  reminderSentAt?: string | null
  overdueNotifiedAt?: string | null
  deactivation: {
    warnedAt?: string | null
    deactivatedAt?: string | null
    reactivatedAt?: string | null
    reason?: string
  }
  workspaceId?: string | null
  createdAt: string
  updatedAt: string
}

export interface Payment {
  _id: string
  invoiceId: string | Invoice
  clientId: string | Client
  clientName: string
  period: string
  amount: number
  currency: string
  paidAt: string
  method: PaymentMethod
  reference?: string
  notes?: string
  receiptUrl?: string
  registeredByName?: string
  createdAt: string
}

export interface WorkspaceImage {
  name: string
  url: string
  categoria: string
  tipo?: string
}

export interface Workspace {
  _id: string
  name: string
  isActive: boolean
  adminName?: string
  adminEmail?: string
  adminPhotoUrl?: string | null
  createdAt?: string

  /** Imagen principal del espacio: logo del cliente o foto de su página de Meta. */
  imageUrl?: string | null
  logoUrl?: string | null
  pictureUrl?: string | null
  images?: WorkspaceImage[]
  pageName?: string | null
  instagramAccountName?: string | null
  tipoNegocio?: string | null
  vertical?: string | null

  client?: Pick<Client, '_id' | 'name' | 'amount' | 'isActive'> | null
  /** El espacio está abierto pero el cliente lleva mora por encima de sus días de gracia. */
  shouldBeClosed?: boolean
  overdueAmount?: number
  maxDaysOverdue?: number
  accessOverride?: AccessOverride | null
}

/** Acceso abierto a propósito pese a la mora. */
export interface AccessOverride {
  enabled: boolean
  reason?: string
  grantedAt?: string | null
  grantedByName?: string
  /** null = indefinida, hay que revocarla a mano. */
  until?: string | null
  revokedAt?: string | null
  revokedByName?: string
}

export interface NotificationSettings {
  _id?: string
  fromEmail: string
  replyTo: string
  recipients: string[]
  alwaysTo: string[]
  ccEmails: string[]
  toggles: {
    paymentRegistered: boolean
    reminderBefore: boolean
    overdue: boolean
    deactivation: boolean
    monthlySummary: boolean
  }
  reminderDaysBefore: number
  graceDays: number
  warnBeforeDeactivationDays: number
  autoDeactivateEnabled: boolean
  sendHour: number
}

export interface AppSettings {
  _id?: string
  appName: string
  logoUrl: string
  iconUrl: string
  brandColors: Record<string, string>
  currency: string
  timezone: string
}

export interface DashboardSummary {
  period: string
  expectedAmount: number
  collectedAmount: number
  pendingAmount: number
  overdueAmount: number
  collectionRate: number
  clientsTotal: number
  clientsActive: number
  clientsOverdue: number
  invoicesTotal: number
  invoicesPaid: number
  invoicesPending: number
  invoicesOverdue: number
  workspacesDeactivated: number
  /** Lo que debería entrar cada mes si todos los clientes activos pagan. */
  idealMonthlyAmount: number
  archivedClients: number
}

export interface RevenuePoint {
  period: string
  label: string
  expected: number
  collected: number
}

export interface BreakdownItem {
  key: string
  label: string
  count: number
  amount: number
}

export interface AgingBucket {
  bucket: string
  count: number
  amount: number
}

export interface ClientStats {
  totalClients: number
  activeClients: number
  inactiveClients: number
  archivedClients: number
  linkedWorkspaces: number
  expectedMonthlyAmount: number
  /** Lo que debería entrar cada mes si todos los clientes activos pagan. */
  idealMonthlyAmount: number
}

export interface InvoiceSummary {
  period: string
  total: number
  paid: number
  pending: number
  overdue: number
  waived: number
  cancelled: number
  collectedAmount: number
  expectedAmount: number
  pendingAmount: number
  collectionRate: number
}

export interface WorkspaceSuggestion {
  workspaceId: string
  workspaceName: string
  isActive: boolean
  adminName?: string
  adminEmail?: string
  imageUrl?: string | null
  score: number
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  limit: number
  pages: number
}

export interface ToastItem {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration: number
}

// ── Pronóstico de cobranza ───────────────────────────────────────
// El dinero esperado sale de dos fuentes: facturas de clientes actuales y
// cuotas de ventas nuevas. El pronóstico las mezcla en los mismos tramos.

export interface CashflowSource {
  count: number
  amount: number
}

export interface CashflowWeek {
  index: number
  start: string
  end: string
  isCurrent: boolean
  invoices: CashflowSource
  sales: CashflowSource
  total: number
}

export interface CashflowBucket {
  label: string
  minDays: number
  maxDays: number | null
  count: number
  amount: number
}

/** Dinero que ya entró, separando venta nueva de cliente con más de un mes. */
export interface RealizedWeek {
  index: number
  start: string
  end: string
  isCurrent: boolean
  newBusiness: CashflowSource
  recurring: CashflowSource
  total: number
}

export interface CollectedReport {
  weeks: RealizedWeek[]
  thisWeek: RealizedWeek | null
  vsPreviousWeek: number | null
  totals: {
    collected: number
    newBusiness: number
    recurring: number
  }
}

export interface CashflowForecast {
  generatedAt: string
  weeks: CashflowWeek[]
  overdue: {
    total: number
    count: number
    invoices: CashflowSource
    sales: CashflowSource
    buckets: CashflowBucket[]
  }
  totals: {
    upcoming: number
    overdue: number
    expected: number
    thisWeek: number
    peakWeekStart: string | null
    peakWeekAmount: number
  }
}

// ── Ventas ───────────────────────────────────────────────────────
// Acuerdo cerrado hoy que se cobra más adelante. Vive aparte de las facturas:
// al cerrarse puede no existir todavía el cliente.

export const SALE_FREQUENCIES = ['unico', 'semanal', 'quincenal', 'mensual', 'trimestral'] as const
export type SaleFrequency = (typeof SALE_FREQUENCIES)[number]

export const SALE_FREQUENCY_LABELS: Record<SaleFrequency, string> = {
  unico: 'Pago único',
  semanal: 'Cada semana',
  quincenal: 'Cada quince días',
  mensual: 'Cada mes',
  trimestral: 'Cada tres meses',
}

export const SALE_STATUSES = ['acordada', 'cobrando', 'cobrada', 'perdida'] as const
export type SaleStatus = (typeof SALE_STATUSES)[number]

export const SALE_STATUS_LABELS: Record<SaleStatus, string> = {
  acordada: 'Acordada, sin cobrar',
  cobrando: 'Cobro en curso',
  cobrada: 'Cobrada',
  perdida: 'Perdida',
}

export type SaleInstallmentStatus = 'pendiente' | 'vencida' | 'cobrada'

export const SALE_ITEM_KINDS = ['recurrente', 'unico'] as const
export type SaleItemKind = (typeof SALE_ITEM_KINDS)[number]

export const SALE_ITEM_KIND_LABELS: Record<SaleItemKind, string> = {
  recurrente: 'Mensualidad / recurrente',
  unico: 'Pago único',
}

/** Un concepto vendido: qué es, qué incluye y a qué precio se cerró. */
export interface SaleItem {
  concept: string
  description?: string
  amount: number
  kind: SaleItemKind
}

/** Datos de facturación del acuerdo, para quien cobre. */
export interface SaleBilling {
  needsInvoice: boolean
  legalName?: string
  taxId?: string
  email?: string
  address?: string
  phone?: string
  invoiceNumber?: string
  issuedAt?: string | null
  notes?: string
}

export const SALE_LOST_REASONS = [
  'nunca_pago',
  'se_arrepintio',
  'no_contesta',
  'se_fue_competencia',
  'precio',
  'problema_interno',
  'otro',
] as const
export type SaleLostReason = (typeof SALE_LOST_REASONS)[number]

export const SALE_LOST_REASON_LABELS: Record<SaleLostReason, string> = {
  nunca_pago: 'Nunca pagó',
  se_arrepintio: 'Se arrepintió',
  no_contesta: 'Dejó de contestar',
  se_fue_competencia: 'Se fue con la competencia',
  precio: 'Precio',
  problema_interno: 'Problema interno de Bakano',
  otro: 'Otro',
}

export interface SaleInstallment {
  index: number
  dueDate: string
  amount: number
  status: SaleInstallmentStatus
  paidAt?: string | null
  paidAmount: number
  originalDueDate?: string | null
  notes?: string
}

export interface SaleHistoryEntry {
  action: string
  detail?: string
  at: string
  byName?: string
  meta?: Record<string, unknown>
}

export interface Sale {
  _id: string
  businessName: string
  clientId?: string | null
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  amount: number
  items: SaleItem[]
  billing: SaleBilling
  currency: string
  frequency: SaleFrequency
  installmentsCount: number
  firstChargeDate: string
  installments: SaleInstallment[]
  soldBy: string
  soldByName?: string
  ownerId: string
  ownerName?: string
  agreedAt: string
  status: SaleStatus
  lostReason?: SaleLostReason | null
  lostNotes?: string
  lostAt?: string | null
  notes?: string
  history: SaleHistoryEntry[]
  createdAt: string
  updatedAt: string
}

export interface SaleSummary {
  recurringMonthly: number
  newSales: {
    agreed: number
    collected: number
    pending: number
    overdue: number
    lost: number
    recurringSold: number
    oneOffSold: number
    missingInvoice: number
  }
  expectedTotal: number
  byOwner: Array<{ ownerName: string; pending: number; overdue: number; count: number }>
}

export interface SelectOption {
  value: string | number | null
  label: string
  icon?: string
  /**
   * Logo de la opción. Con `null` igual se pinta el avatar, resuelto a iniciales
   * con color propio; omite la clave si la opción no lleva avatar.
   */
  image?: string | null
  color?: string
  description?: string
  disabled?: boolean
}

// ── Banco (Mercury) ──────────────────────────────────────────────
// La integración es de solo lectura: no existen mutaciones desde la app.

export interface BankAccount {
  id: string
  name?: string
  nickname?: string | null
  legalBusinessName?: string | null
  status?: string
  type?: string
  kind?: string
  currentBalance?: number
  availableBalance?: number
  accountNumber?: string
  routingNumber?: string
  dashboardLink?: string
  createdAt?: string
}

export type BankTransactionStatus = 'pending' | 'sent' | 'cancelled' | 'failed' | 'reversed' | 'blocked'

export interface BankTransaction {
  id: string
  accountId?: string
  amount?: number
  status?: BankTransactionStatus | string
  kind?: string
  note?: string | null
  externalMemo?: string | null
  bankDescription?: string | null
  counterpartyName?: string | null
  counterpartyNickname?: string | null
  cardId?: string | null
  mercuryCategory?: string | null
  createdAt?: string
  postedAt?: string | null
  estimatedDeliveryDate?: string | null
  reasonForFailure?: string | null
  dashboardLink?: string
  /** Presente cuando el movimiento forma parte de una suscripción detectada. */
  subscription?: {
    key: string
    name: string
    cadenceLabel: string
    status: BankSubscriptionStatus
    monthlyCost: number
  } | null
}

export interface BankCard {
  cardId: string
  nameOnCard?: string
  lastFourDigits?: string
  status?: string
  physicalCardStatus?: string | null
  network?: string
  type?: string
  createdAt?: string
  updatedAt?: string
}

export interface BankStatement {
  id: string
  startDate?: string
  endDate?: string
  endingBalance?: number
  downloadUrl?: string
  accountNumber?: string
}

export interface BankCashflowPoint {
  /** `YYYY-MM` */
  period: string
  inflow: number
  outflow: number
  net: number
  count: number
}

export interface BankCounterparty {
  name: string
  outflow: number
  inflow: number
  count: number
  lastAt: string | null
}

export interface BankOverview {
  configured: boolean
  accounts: BankAccount[]
  totals: {
    accounts: number
    currentBalance: number
    availableBalance: number
    pendingCount: number
    analyzedTransactions: number
  }
  window: { start: string; end: string; days: number }
  cashflow: BankCashflowPoint[]
  topCounterparties: BankCounterparty[]
  recentTransactions: BankTransaction[]
}

export type BankSubscriptionStatus = 'active' | 'failing' | 'due' | 'stale'

export type BankCadence = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' | 'irregular'

export interface BankSubscriptionCharge {
  id: string
  date: string
  amount: number
  status: string
  failed: boolean
  /** Intentos que hizo el comercio para ese mismo cobro. */
  attempts: number
  accountId?: string
  cardId?: string | null
}

export interface BankSubscription {
  key: string
  name: string
  amount: number
  cadence: BankCadence
  cadenceLabel: string
  intervalDays: number
  monthlyCost: number
  yearlyCost: number
  /** La cadencia se asumió por falta de historial. */
  estimated: boolean
  charges: number
  failedCharges: number
  failedAttempts: number
  totalPaid: number
  failedAmount: number
  firstChargeAt: string | null
  lastChargeAt: string | null
  lastAttemptAt: string
  lastAttemptFailed: boolean
  nextChargeAt: string | null
  daysSinceLast: number | null
  status: BankSubscriptionStatus
  accountIds: string[]
  cardIds: string[]
  recentCharges: BankSubscriptionCharge[]
}

export interface BankSubscriptionsReport {
  configured: boolean
  window: { start: string; end: string; days: number }
  /** Rango realmente cubierto por los movimientos disponibles en Mercury. */
  history: { from: string | null; to: string | null; days: number; transactions: number }
  totals: {
    subscriptions: number
    active: number
    failing: number
    monthlyCost: number
    yearlyCost: number
    paidInWindow: number
    failedAmount: number
  }
  items: BankSubscription[]
  candidates: Array<{ name: string; charges: number; totalPaid: number; lastChargeAt: string }>
}

export interface BankHealth {
  configured: boolean
  reachable: boolean
  message: string
  errorCode?: string
  /** IP saliente que Mercury rechazó, cuando `errorCode === 'ipNotWhitelisted'`. */
  ip?: string
  checkedAt: string
}
