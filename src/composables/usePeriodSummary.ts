import { ref, watch, type Ref } from 'vue'
import api from '@/services/api.service'
import type { InvoiceSummary } from '@/types'

/**
 * Cobrado vs por cobrar de un período, desde `invoices/summary`. Se usa fuera de
 * /cobros (Pagos, Clientes) sin tocar el resumen del store de cobros, que sigue
 * el período elegido en esa vista.
 */
export function usePeriodSummary(period: Ref<string>) {
  const summary = ref<InvoiceSummary | null>(null)
  const loading = ref(false)

  async function load() {
    loading.value = true
    try {
      summary.value = (await api.invoiceSummary(period.value)) as unknown as InvoiceSummary
    } catch {
      summary.value = null
    } finally {
      loading.value = false
    }
  }

  watch(period, load, { immediate: true })

  return { summary, loading, reload: load }
}
