import APIBase from './httpBase'
import type {
  AppSettings,
  BankAccount,
  BankCard,
  BankHealth,
  BankOverview,
  BankStatement,
  BankSubscriptionsReport,
  BankTransaction,
  BreakdownItem,
  AgingBucket,
  ChurnReport,
  Client,
  ClientStats,
  DashboardSummary,
  Invoice,
  InvoiceSummary,
  NotificationSettings,
  PaginatedResult,
  Payment,
  RevenuePoint,
  User,
  Workspace,
  WorkspaceSuggestion,
} from '@/types'

type Query = Record<string, string | number | boolean | undefined | null>

/** El backend envuelve las colecciones del dashboard en `{ ...meta, items }`. */
interface Wrapped<T> {
  items: T[]
  [key: string]: unknown
}

function qs(params: Query = {}): string {
  const usp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') usp.append(k, String(v))
  })
  const s = usp.toString()
  return s ? `?${s}` : ''
}

class ApiService extends APIBase {
  // ── Auth ─────────────────────────────────────────────────────
  async login(email: string, password: string) {
    const { data } = await this.post<{ token: string; user: User }>('auth/login', {
      email,
      password,
    })
    return data
  }

  async me() {
    const { data } = await this.get<User>('auth/me')
    return data
  }

  async changePassword(currentPassword: string, newPassword: string) {
    const { data } = await this.post<{ message: string }>('auth/change-password', {
      currentPassword,
      newPassword,
    })
    return data
  }

  // ── Usuarios ─────────────────────────────────────────────────
  async listUsers(params: Query = {}) {
    const { data } = await this.get<PaginatedResult<User>>(`users${qs(params)}`)
    return data
  }
  async createUser(payload: Partial<User> & { password: string }) {
    const { data } = await this.post<User>('users', payload)
    return data
  }
  async updateUser(id: string, payload: Partial<User> & { password?: string }) {
    const { data } = await this.put<User>(`users/${id}`, payload)
    return data
  }
  async toggleUser(id: string, isActive: boolean) {
    const { data } = await this.patch<User>(`users/${id}/active`, { isActive })
    return data
  }
  async deleteUser(id: string) {
    const { data } = await this.delete<{ message: string }>(`users/${id}`)
    return data
  }

  // ── Clientes ─────────────────────────────────────────────────
  async listClients(params: Query = {}) {
    const { data } = await this.get<PaginatedResult<Client>>(`clients${qs(params)}`)
    return data
  }
  async clientStats() {
    const { data } = await this.get<ClientStats>('clients/stats')
    return data
  }
  async getClient(id: string) {
    const { data } = await this.get<Client>(`clients/${id}`)
    return data
  }
  async createClient(payload: Partial<Client>) {
    const { data } = await this.post<Client>('clients', payload)
    return data
  }
  async updateClient(id: string, payload: Partial<Client>) {
    const { data } = await this.put<Client>(`clients/${id}`, payload)
    return data
  }
  /** Los clientes ya no se borran: se dan de baja conservando el historial. */
  async archiveClient(id: string, form: FormData) {
    const { data } = await this.post<{
      client: Client
      workspaceStillActive?: boolean
    }>(`clients/${id}/archive`, form)
    return data
  }
  async reactivateClient(id: string, notes?: string) {
    const { data } = await this.post<Client>(`clients/${id}/reactivate`, { notes })
    return data
  }
  async addClientAttachments(id: string, form: FormData) {
    const { data } = await this.post<Client>(`clients/${id}/attachments`, form)
    return data
  }
  async listArchivedClients(params: Query = {}) {
    const { data } = await this.get<Wrapped<Client>>(`clients/archived${qs(params)}`)
    return data.items ?? []
  }
  /** Borrado real. Solo superadmin y solo si el cliente nunca tuvo pagos. */
  async purgeClient(id: string) {
    const { data } = await this.delete<{ message: string }>(`clients/${id}/purge`)
    return data
  }
  async toggleClient(id: string, isActive: boolean, reason?: string) {
    const { data } = await this.patch<Client>(`clients/${id}/active`, { isActive, reason })
    return data
  }
  async linkWorkspace(id: string, workspaceId: string, workspaceName: string) {
    const { data } = await this.post<Client>(`clients/${id}/link-workspace`, {
      workspaceId,
      workspaceName,
    })
    return data
  }
  async unlinkWorkspace(id: string) {
    const { data } = await this.delete<Client>(`clients/${id}/link-workspace`)
    return data
  }
  async workspaceSuggestions(id: string) {
    const { data } = await this.get<WorkspaceSuggestion[] | Wrapped<WorkspaceSuggestion>>(
      `clients/${id}/workspace-suggestions`,
    )
    return Array.isArray(data) ? data : (data.items ?? [])
  }
  async backfillClient(id: string, payload: { fromDate: string; markPaidUntil?: string | null }) {
    const { data } = await this.post<{ created: number; markedPaid: number }>(
      `clients/${id}/backfill`,
      payload,
    )
    return data
  }

  // ── Facturas / cobros ────────────────────────────────────────
  async listInvoices(params: Query = {}) {
    const { data } = await this.get<PaginatedResult<Invoice>>(`invoices${qs(params)}`)
    return data
  }
  async invoiceSummary(period: string) {
    const { data } = await this.get<InvoiceSummary>(`invoices/summary${qs({ period })}`)
    return data
  }
  async generateInvoices(period: string, force = false) {
    const { data } = await this.post<{ created: number; skipped: number; period: string }>(
      'invoices/generate',
      { period, force },
    )
    return data
  }
  async getInvoice(id: string) {
    const { data } = await this.get<Invoice>(`invoices/${id}`)
    return data
  }
  async updateInvoice(id: string, payload: Partial<Invoice>) {
    const { data } = await this.put<Invoice>(`invoices/${id}`, payload)
    return data
  }
  async waiveInvoice(id: string, reason: string) {
    const { data } = await this.patch<Invoice>(`invoices/${id}/waive`, { reason })
    return data
  }
  async cancelInvoice(id: string, reason: string) {
    const { data } = await this.patch<Invoice>(`invoices/${id}/cancel`, { reason })
    return data
  }
  async recalcInvoices() {
    const { data } = await this.post<{ updated: number }>('invoices/recalc', {})
    return data
  }
  /** Acuerdo de pago: mueve el vencimiento de esta factura, no el día de cobro del cliente. */
  async deferInvoice(
    id: string,
    payload: { newDueDate: string; reason?: string; notes?: string },
  ) {
    const { data } = await this.patch<Invoice>(`invoices/${id}/defer`, payload)
    return data
  }
  async undoDeferInvoice(id: string) {
    const { data } = await this.delete<Invoice>(`invoices/${id}/defer`)
    return data
  }
  /** Cobro anticipado: crea el cobro de un período futuro para poder pagarlo hoy. */
  async createAdvanceInvoice(payload: {
    clientId: string
    period: string
    amount?: number
    dueDate?: string
    splitIndex?: number
    notes?: string
  }) {
    const { data } = await this.post<Invoice>('invoices/advance', payload)
    return data
  }

  // ── Pagos ────────────────────────────────────────────────────
  async listPayments(params: Query = {}) {
    const { data } = await this.get<PaginatedResult<Payment>>(`payments${qs(params)}`)
    return data
  }
  async registerPayment(form: FormData) {
    const { data } = await this.post<{ payment: Payment; invoice: Invoice }>('payments', form)
    return data
  }
  async deletePayment(id: string) {
    const { data } = await this.delete<{ message: string }>(`payments/${id}`)
    return data
  }

  // ── Dashboard ────────────────────────────────────────────────
  async dashboardSummary(period?: string) {
    const { data } = await this.get<DashboardSummary>(`dashboard/summary${qs({ period })}`)
    return data
  }
  async revenueSeries(months = 12) {
    const { data } = await this.get<Wrapped<RevenuePoint>>(
      `dashboard/revenue-series${qs({ months })}`,
    )
    return data.items ?? []
  }
  async statusBreakdown(period?: string) {
    const { data } = await this.get<Wrapped<BreakdownItem>>(
      `dashboard/status-breakdown${qs({ period })}`,
    )
    return data.items ?? []
  }
  async methodBreakdown(period?: string) {
    const { data } = await this.get<Wrapped<BreakdownItem>>(
      `dashboard/method-breakdown${qs({ period })}`,
    )
    return data.items ?? []
  }
  async topClients(period?: string, limit = 10) {
    const { data } = await this.get<Wrapped<BreakdownItem>>(
      `dashboard/top-clients${qs({ period, limit })}`,
    )
    return data.items ?? []
  }
  async aging() {
    const { data } = await this.get<Wrapped<AgingBucket>>('dashboard/aging')
    return data.items ?? []
  }
  async churnReport() {
    const { data } = await this.get<ChurnReport>('dashboard/churn')
    return data
  }
  async upcoming(days = 15) {
    const { data } = await this.get<Wrapped<Invoice>>(`dashboard/upcoming${qs({ days })}`)
    return data.items ?? []
  }
  async overdue(limit = 50) {
    const { data } = await this.get<Wrapped<Invoice>>(`dashboard/overdue${qs({ limit })}`)
    return data.items ?? []
  }

  // ── Workspaces (proxy a métricas) ────────────────────────────
  /** Estado completo de la integración: si no está configurada, `configured` es false. */
  async workspacesStatus() {
    const { data } = await this.get<{
      configured: boolean
      total: number
      items: Workspace[]
      orphanClients: Array<Pick<Client, '_id' | 'name'>>
      message?: string
    }>('workspaces')
    return data
  }
  async listWorkspaces() {
    const data = await this.workspacesStatus()
    return data.items ?? []
  }
  async setWorkspaceActive(id: string, isActive: boolean, reason?: string) {
    const { data } = await this.patch<Workspace>(`workspaces/${id}/active`, { isActive, reason })
    return data
  }
  /** Abre el acceso a un cliente moroso dejándolo marcado como "debería estar cerrado". */
  async grantAccess(clientId: string, payload: { reason: string; until?: string | null }) {
    const { data } = await this.post<Client>(`clients/${clientId}/grant-access`, payload)
    return data
  }
  async revokeAccess(clientId: string, closeWorkspace = true) {
    const { data } = await this.delete<Client>(
      `clients/${clientId}/grant-access${qs({ closeWorkspace })}`,
    )
    return data
  }
  async listAccessOverrides() {
    const { data } = await this.get<Wrapped<Client>>('clients/access-overrides')
    return data.items ?? []
  }
  /** Refresca las imágenes de los espacios vinculados desde métricas. */
  async syncWorkspaceImages() {
    const { data } = await this.post<{ updated: number; notFound: number; total: number }>(
      'clients/sync-workspace-images',
      {},
    )
    return data
  }
  async workspacesHealth() {
    const { data } = await this.get<{ ok: boolean }>('workspaces/health')
    return data
  }

  // ── Banco (Mercury, solo lectura) ────────────────────────────
  /** Foto general: cuentas, saldos, flujo mensual y últimos movimientos. */
  async bankOverview(params: { days?: number; refresh?: boolean } = {}) {
    const { data } = await this.get<BankOverview>(`mercury/overview${qs(params)}`)
    return data
  }
  async bankAccounts(refresh = false) {
    const { data } = await this.get<{
      configured: boolean
      total: number
      currentBalance: number
      availableBalance: number
      items: BankAccount[]
    }>(`mercury/accounts${qs({ refresh: refresh || undefined })}`)
    return data
  }
  async bankTransactions(accountId: string, params: Query = {}) {
    const { data } = await this.get<{
      limit: number
      offset: number
      count: number
      hasMore: boolean
      items: BankTransaction[]
    }>(`mercury/accounts/${accountId}/transactions${qs(params)}`)
    return data
  }
  /** Suscripciones inferidas de los cargos recurrentes de todas las cuentas. */
  async bankSubscriptions(params: { days?: number; refresh?: boolean } = {}) {
    const { data } = await this.get<BankSubscriptionsReport>(`mercury/subscriptions${qs(params)}`)
    return data
  }
  async bankCards(accountId: string, refresh = false) {
    const { data } = await this.get<Wrapped<BankCard>>(
      `mercury/accounts/${accountId}/cards${qs({ refresh: refresh || undefined })}`,
    )
    return data.items ?? []
  }
  async bankStatements(accountId: string, params: Query = {}) {
    const { data } = await this.get<Wrapped<BankStatement>>(
      `mercury/accounts/${accountId}/statements${qs(params)}`,
    )
    return data.items ?? []
  }
  async bankHealth() {
    const { data } = await this.get<BankHealth>('mercury/health')
    return data
  }

  // ── Ajustes ──────────────────────────────────────────────────
  async getNotificationSettings() {
    const { data } = await this.get<NotificationSettings>('settings/notifications')
    return data
  }
  async updateNotificationSettings(payload: Partial<NotificationSettings>) {
    const { data } = await this.put<NotificationSettings>('settings/notifications', payload)
    return data
  }
  async sendTestEmail(to: string) {
    const { data } = await this.post<{ message: string }>('settings/notifications/test', { to })
    return data
  }
  async getAppSettings() {
    const { data } = await this.get<AppSettings>('settings/app')
    return data
  }
  async updateAppSettings(payload: Partial<AppSettings>) {
    const { data } = await this.put<AppSettings>('settings/app', payload)
    return data
  }
  async uploadLogo(form: FormData) {
    const { data } = await this.post<AppSettings>('settings/app/logo', form)
    return data
  }
}

export const api = new ApiService()
export default api
