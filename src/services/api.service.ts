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
  CashflowForecast,
  ChurnReport,
  CollectedReport,
  Client,
  ClientCategory,
  ClientStats,
  DashboardSummary,
  Guarantee,
  GuaranteeOutcome,
  GuaranteeSummary,
  Invoice,
  InvoiceSummary,
  NotificationSettings,
  PaginatedResult,
  Payment,
  PaymentMethod,
  PaymentSubmission,
  CrmConsumptionList,
  StripeCustomerRow,
  StripeImportResult,
  Refund,
  RefundReason,
  RefundSummary,
  RevenuePoint,
  Sale,
  SaleBilling,
  SaleGoal,
  SaleGoalLine,
  SaleGoalProgress,
  SaleItem,
  SaleLostReason,
  SaleSummary,
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
  /** Corrige fecha de entrada y/o de baja recalculando la antigüedad. */
  async updateLifecycleDates(id: string, payload: { startDate?: string; archivedAt?: string }) {
    const { data } = await this.patch<{ client: Client; message: string }>(
      `clients/${id}/lifecycle-dates`,
      payload,
    )
    return data.client
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

  // ── Categorías de cliente ────────────────────────────────────
  async listCategories(includeInactive = false) {
    const { data } = await this.get<Wrapped<ClientCategory>>(
      `clients/categories${qs({ includeInactive: includeInactive || undefined })}`,
    )
    return data.items ?? []
  }
  async createCategory(payload: Partial<ClientCategory>) {
    const { data } = await this.post<ClientCategory>('clients/categories', payload)
    return data
  }
  async updateCategory(id: string, payload: Partial<ClientCategory>) {
    const { data } = await this.put<ClientCategory>(`clients/categories/${id}`, payload)
    return data
  }
  async deleteCategory(id: string) {
    const { data } = await this.delete<{ message: string }>(`clients/categories/${id}`)
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
  async generateInvoices(period: string, force = false, clientIds?: string[]) {
    const { data } = await this.post<{ created: number; skipped: number; period: string }>(
      'invoices/generate',
      { period, force, ...(clientIds?.length ? { clientIds } : {}) },
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
    // El endpoint responde `{ invoice, created }`, no la factura pelada. Tiparlo
    // como `Invoice` dejaba `_id`/`period`/`amount` en undefined río abajo.
    const { data } = await this.post<{ invoice: Invoice; created: boolean }>(
      'invoices/advance',
      payload,
    )
    return data.invoice
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
  /** Un pago único que se reparte entre los cobros abiertos del cliente. */
  async settlePayment(payload: {
    clientId: string
    amount: number
    paidAt?: string
    method?: PaymentMethod
    reference?: string
    notes?: string
    invoiceIds?: string[]
  }) {
    const { data } = await this.post<{
      clientName: string
      totalApplied: number
      invoicesSettled: number
      applied: Array<{ invoiceId: string; period: string; amount: number }>
    }>('payments/settle', payload)
    return data
  }
  async deletePayment(id: string) {
    const { data } = await this.delete<{ message: string }>(`payments/${id}`)
    return data
  }

  // ── Comprobantes del portal (transferencias del cliente) ─────
  async listSubmissions(params: Query = {}) {
    const { data } = await this.get<PaginatedResult<PaymentSubmission>>(
      `payment-submissions${qs(params)}`,
    )
    return data
  }
  /** Aprueba por el NETO recibido: el fee bancario lo asume el cliente. */
  async approveSubmission(id: string, payload: { invoiceId?: string; reviewNote?: string } = {}) {
    const { data } = await this.post<{
      submission: PaymentSubmission
      payment: Payment
      invoice: Invoice
    }>(`payment-submissions/${id}/approve`, payload)
    return data
  }
  async rejectSubmission(id: string, payload: { reviewNote: string }) {
    const { data } = await this.post<{ submission: PaymentSubmission }>(
      `payment-submissions/${id}/reject`,
      payload,
    )
    return data
  }

  // ── Stripe ───────────────────────────────────────────────────
  async stripeStatus() {
    const { data } = await this.get<{ configured: boolean; webhookConfigured: boolean }>(
      'stripe/status',
    )
    return data
  }
  async stripeImportCustomers() {
    const { data } = await this.get<{ customers: StripeCustomerRow[] }>('stripe/import/customers')
    return data.customers
  }
  async stripeLinkCustomer(payload: { clientId: string; stripeCustomerId: string }) {
    const { data } = await this.post<{ message: string; client: Client }>(
      'stripe/import/link',
      payload,
    )
    return data
  }
  async stripeUnlinkCustomer(clientId: string, stripeCustomerId?: string) {
    const suffix = stripeCustomerId ? `/${stripeCustomerId}` : ''
    const { data } = await this.delete<{ message: string; client: Client }>(
      `stripe/import/link/${clientId}${suffix}`,
    )
    return data
  }
  async stripeImportCharges(clientId: string) {
    const { data } = await this.post<StripeImportResult>('stripe/import/charges', { clientId })
    return data
  }

  // ── Consumo CRM (GoHighLevel) ────────────────────────────────
  async listCrmConsumption(params: Query = {}) {
    const { data } = await this.get<CrmConsumptionList>(`crm-consumption${qs(params)}`)
    return data
  }
  /** Reclasifica: el cargo era una mensualidad y se registra como pago de esa factura. */
  async applyCrmConsumption(id: string, invoiceId: string) {
    const { data } = await this.post<{ payment: Payment; invoice: Invoice; message: string }>(
      `crm-consumption/${id}/apply`,
      { invoiceId },
    )
    return data
  }
  async removeCrmConsumption(id: string) {
    const { data } = await this.delete<{ message: string }>(`crm-consumption/${id}`)
    return data
  }

  // ── Reembolsos ───────────────────────────────────────────────
  async listRefunds(params: Query = {}) {
    const { data } = await this.get<PaginatedResult<Refund>>(`refunds${qs(params)}`)
    return data
  }
  async refundSummary() {
    const { data } = await this.get<RefundSummary>('refunds/summary')
    return data
  }
  /**
   * El comprobante viaja como archivo, así que va en FormData igual que el pago.
   * `archiveClient` en el formulario deja al cliente de baja en el mismo paso.
   */
  async registerRefund(form: FormData) {
    const { data } = await this.post<{
      refund: Refund
      invoice: Invoice
      archived: boolean
      netCollected: number
      message: string
    }>('refunds', form)
    return data
  }
  async refundsByClient(clientId: string) {
    const { data } = await this.get<Wrapped<Refund>>(`refunds/client/${clientId}`)
    return data.items ?? []
  }
  async deleteRefund(id: string) {
    const { data } = await this.delete<{ message: string }>(`refunds/${id}`)
    return data
  }

  // ── Garantías ────────────────────────────────────────────────
  async listGuarantees(params: Query = {}) {
    const { data } = await this.get<PaginatedResult<Guarantee>>(`guarantees${qs(params)}`)
    return data
  }
  async guaranteeSummary() {
    const { data } = await this.get<GuaranteeSummary>('guarantees/summary')
    return data
  }
  /** Abre el mes de garantía: el período indicado deja de cobrarse. */
  async openGuarantee(payload: {
    clientId: string
    period?: string
    triggerPeriod?: string
    reason?: string
  }) {
    const { data } = await this.post<{
      guarantee: Guarantee
      waivedAmount: number
      waivedInvoices: number
      message: string
    }>('guarantees', payload)
    return data
  }
  /** Segundo y último mes que permite la política. */
  async extendGuarantee(id: string, payload: { period?: string; resultNotes?: string } = {}) {
    const { data } = await this.post<{
      guarantee: Guarantee
      waivedAmount: number
      message: string
    }>(`guarantees/${id}/extend`, payload)
    return data
  }
  async closeGuarantee(
    id: string,
    payload: {
      outcome: GuaranteeOutcome
      notes?: string
      archiveClient?: boolean
      refund?: {
        paymentId?: string
        invoiceId?: string
        amount: number
        reason?: RefundReason
        refundedAt?: string
        notes?: string
      }
    },
  ) {
    const { data } = await this.post<{
      guarantee: Guarantee
      archived: boolean
      refundId: string | null
      restoredInvoices: number
      message: string
    }>(`guarantees/${id}/close`, payload)
    return data
  }
  async guaranteesByClient(clientId: string) {
    const { data } = await this.get<{
      total: number
      items: Guarantee[]
      current: Guarantee | null
    }>(`guarantees/client/${clientId}`)
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

  // ── Ventas ───────────────────────────────────────────────────
  async listSales(params: Query = {}) {
    const { data } = await this.get<PaginatedResult<Sale>>(`sales${qs(params)}`)
    return data
  }
  async saleSummary(params: Query = {}) {
    const { data } = await this.get<SaleSummary>(`sales/summary${qs(params)}`)
    return data
  }
  async getSale(id: string) {
    const { data } = await this.get<Sale>(`sales/${id}`)
    return data
  }
  async createSale(payload: Record<string, unknown>) {
    const { data } = await this.post<Sale>('sales', payload)
    return data
  }
  async paySaleInstallment(
    id: string,
    index: number,
    payload: { amount?: number; paidAt?: string; notes?: string },
  ) {
    const { data } = await this.post<Sale>(`sales/${id}/installments/${index}/pay`, payload)
    return data
  }
  async rescheduleSaleInstallment(
    id: string,
    index: number,
    payload: { newDueDate: string; reason?: string },
  ) {
    const { data } = await this.patch<Sale>(
      `sales/${id}/installments/${index}/reschedule`,
      payload,
    )
    return data
  }
  async updateSaleItems(id: string, items: SaleItem[]) {
    const { data } = await this.patch<Sale>(`sales/${id}/items`, { items })
    return data
  }
  async updateSaleBilling(id: string, payload: Partial<SaleBilling>) {
    const { data } = await this.patch<Sale>(`sales/${id}/billing`, payload)
    return data
  }
  async changeSaleOwner(id: string, ownerId: string) {
    const { data } = await this.patch<Sale>(`sales/${id}/owner`, { ownerId })
    return data
  }
  async loseSale(id: string, payload: { reason: SaleLostReason; notes?: string; lostAt?: string }) {
    const { data } = await this.post<Sale>(`sales/${id}/lose`, payload)
    return data
  }
  async reopenSale(id: string) {
    const { data } = await this.post<Sale>(`sales/${id}/reopen`, {})
    return data
  }
  /** Ubica la venta en un tipo de cliente; `null` la deja sin clasificar. */
  async changeSaleCategory(id: string, categoryId: string | null) {
    const { data } = await this.patch<Sale>(`sales/${id}/category`, { categoryId })
    return data
  }
  // ── Objetivo de venta mensual ─────────────────────────────────
  async saleGoal(period: string) {
    const { data } = await this.get<SaleGoal>(`sales/goals/${period}`)
    return data
  }
  async saveSaleGoal(
    period: string,
    payload: { lines: Array<Pick<SaleGoalLine, 'categoryId' | 'targetCount' | 'targetAmount' | 'notes'>>; notes?: string },
  ) {
    const { data } = await this.put<SaleGoal>(`sales/goals/${period}`, payload)
    return data
  }
  async saleGoalProgress(period: string) {
    const { data } = await this.get<SaleGoalProgress>(`sales/goals/${period}/progress`)
    return data
  }
  /** Pronóstico semanal: facturas + cuotas de ventas, y lo atrasado con antigüedad. */
  async cashflow(weeks = 8) {
    const { data } = await this.get<CashflowForecast>(`dashboard/cashflow${qs({ weeks })}`)
    return data
  }
  /** Cobrado real por semana, separando venta nueva de cliente recurrente. */
  async collected(weeks = 6) {
    const { data } = await this.get<CollectedReport>(`dashboard/collected${qs({ weeks })}`)
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
