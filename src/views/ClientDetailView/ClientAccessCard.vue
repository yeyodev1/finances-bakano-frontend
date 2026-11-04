<script setup lang="ts">
import { computed } from 'vue'
import { BaseButton } from '@/components/base'
import { useFormat } from '@/composables/useFormat'
import { isOverrideActive } from '@/composables/useAccessOverride'
import type { Client } from '@/types'

/**
 * Lo primero que se ve en la ficha: si el cliente debe y qué le pasa a su acceso
 * a Metrics. Reglas (backend): se cierra cuando la mora pasa los días de gracia
 * (revisión diaria, si `autoDeactivate`); se abre solo al pagar todo lo vencido.
 */
const props = defineProps<{ client: Client; canGrant: boolean }>()
const emit = defineEmits<{ pay: []; grant: []; revoke: []; link: [] }>()

const { formatMoney } = useFormat()

type Tone = 'ok' | 'warn' | 'danger' | 'neutral'

const state = computed<{ tone: Tone; icon: string; title: string; text: string }>(() => {
  const c = props.client
  const owed = Number(c.overdueAmount ?? 0)
  const days = Number(c.maxDaysOverdue ?? 0)
  const grace = Number(c.effectiveGraceDays ?? 0)
  const debt = `Debe ${formatMoney(owed)}${c.overdueInvoices && c.overdueInvoices > 1 ? ` (${c.overdueInvoices} cobros)` : ''}, vencido hace ${days} día${days === 1 ? '' : 's'}.`

  if (!c.workspaceId) {
    return {
      tone: 'neutral',
      icon: 'fa-solid fa-link-slash',
      title: 'No está conectado a Metrics',
      text: owed > 0 ? `${debt} Como no tiene espacio en Metrics, no hay acceso que cerrar.` : 'Sus pagos no abren ni cierran ningún acceso.',
    }
  }
  if (isOverrideActive(c.accessOverride)) {
    return {
      tone: 'warn',
      icon: 'fa-solid fa-unlock-keyhole',
      title: 'Acceso a Metrics abierto por excepción',
      text: owed > 0 ? `${debt} Se le dejó entrar igual a propósito.` : 'Se le dejó entrar a propósito.',
    }
  }
  if (c.workspaceIsActive === false) {
    return {
      tone: 'danger',
      icon: 'fa-solid fa-lock',
      title: 'Acceso a Metrics CERRADO',
      text: owed > 0
        ? `${debt} Cuando registres el pago de lo vencido, su acceso se abre solo.`
        : 'No debe nada vencido. Si el cierre fue por mora, registrar el último pago lo abre; si no, ábrelo en Metrics.',
    }
  }
  if (owed > 0 && c.shouldBeClosed) {
    return {
      tone: 'danger',
      icon: 'fa-solid fa-triangle-exclamation',
      title: 'Su acceso a Metrics se va a cerrar',
      text: `${debt} Ya pasó los ${grace} días de gracia: se cierra en la próxima revisión diaria si no paga.`,
    }
  }
  if (owed > 0) {
    const left = Math.max(grace - days, 0)
    return {
      tone: 'warn',
      icon: 'fa-solid fa-hourglass-half',
      title: c.autoDeactivate ? `Le quedan ${left} día${left === 1 ? '' : 's'} antes de cerrar su acceso` : 'Debe, pero su acceso no se cierra',
      text: c.autoDeactivate
        ? `${debt} Si no paga, su acceso a Metrics se cierra cuando pasen ${grace} días.`
        : `${debt} Este cliente está configurado para no cerrarse nunca por mora.`,
    }
  }
  return {
    tone: 'ok',
    icon: 'fa-solid fa-circle-check',
    title: 'Al día · acceso a Metrics abierto',
    text: 'No debe nada vencido.',
  }
})
</script>

<template>
  <section class="access" :class="`access--${state.tone}`" role="status">
    <i class="access__icon" :class="state.icon" aria-hidden="true" />
    <div class="access__text">
      <strong>{{ state.title }}</strong>
      <p>{{ state.text }}</p>
    </div>
    <div class="access__actions">
      <BaseButton icon="fa-solid fa-hand-holding-dollar" @click="emit('pay')">Registrar pago</BaseButton>
      <BaseButton v-if="!client.workspaceId" variant="outline" icon="fa-solid fa-link" @click="emit('link')">
        Conectar a Metrics
      </BaseButton>
      <BaseButton v-else-if="isOverrideActive(client.accessOverride)" variant="outline" icon="fa-solid fa-lock" @click="emit('revoke')">
        Cerrar acceso
      </BaseButton>
      <BaseButton v-else-if="canGrant" variant="outline" icon="fa-solid fa-unlock-keyhole" @click="emit('grant')">
        Dejarlo entrar igual
      </BaseButton>
    </div>
  </section>
</template>

<style scoped lang="scss">
.access {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: $sp-3 $sp-4;
  padding: $sp-4 $sp-5;
  border-radius: $radius-md;
  border: 1px solid;

  @include md {
    grid-template-columns: auto minmax(0, 1fr) auto;
  }

  &--ok { border-color: rgba($alert-success, 0.4); background: rgba($alert-success, 0.07); --tone: #{$alert-success}; }
  &--warn { border-color: rgba($alert-warning, 0.45); background: rgba($alert-warning, 0.08); --tone: #{$alert-warning}; }
  &--danger { border-color: rgba($alert-error, 0.45); background: rgba($alert-error, 0.07); --tone: #{$alert-error}; }
  &--neutral { border-color: $border-color; background: transparent; --tone: #{$text-secondary}; }
}

.access__icon {
  font-size: 1.6rem;
  color: var(--tone);
}

.access__text {
  @include flex-col(2px);
  min-width: 0;

  strong {
    font-size: $fs-md;
    color: var(--tone);
  }

  p {
    margin: 0;
    font-size: $fs-sm;
  }
}

.access__actions {
  @include flex(row, flex-start, center, $sp-2);
  flex-wrap: wrap;
  grid-column: 1 / -1;

  @include md {
    grid-column: auto;
    justify-content: flex-end;
  }
}
</style>
