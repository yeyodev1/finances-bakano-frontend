<script setup lang="ts">
import { computed } from 'vue'
import { useFormat } from '@/composables/useFormat'
import type { BankAccount } from '@/types'

/**
 * Selector de cuenta. Cada cuenta muestra su peso real sobre el saldo total, así se ve de un
 * vistazo dónde está la plata antes de entrar al detalle.
 *
 * En móvil es un carrusel con scroll horizontal: cuatro cuentas apiladas empujarían todo el
 * contenido fuera de pantalla.
 */

const props = withDefaults(
  defineProps<{
    accounts?: BankAccount[]
    selectedId?: string | null
    loading?: boolean
  }>(),
  { accounts: () => [], selectedId: null, loading: false },
)

defineEmits<{ select: [account: BankAccount] }>()

const { formatMoney } = useFormat()

const total = computed(() =>
  Math.max(
    1,
    props.accounts.reduce((sum, a) => sum + Math.max(0, Number(a.currentBalance || 0)), 0),
  ),
)

function label(account: BankAccount): string {
  const raw = account.nickname || account.name || 'Cuenta'
  // Los nombres largos de Mercury traen el detalle separado por "|": basta la primera parte.
  return raw.split('|')[0]?.trim() || 'Cuenta'
}

function share(account: BankAccount): number {
  return Math.round((Math.max(0, Number(account.currentBalance || 0)) / total.value) * 100)
}
</script>

<template>
  <div class="rail" role="tablist" aria-label="Cuentas">
    <button
      v-for="account in props.accounts"
      :key="account.id"
      type="button"
      role="tab"
      class="rail__item"
      :class="{ 'is-selected': account.id === props.selectedId }"
      :aria-selected="account.id === props.selectedId"
      @click="$emit('select', account)"
    >
      <span class="rail__head">
        <span class="rail__name">{{ label(account) }}</span>
        <span v-if="account.accountNumber" class="rail__last4">
          ··{{ account.accountNumber.slice(-4) }}
        </span>
      </span>

      <span class="rail__balance">{{ formatMoney(account.currentBalance) }}</span>

      <span class="rail__bar" aria-hidden="true">
        <span class="rail__fill" :style="{ width: `${share(account)}%` }" />
      </span>

      <span class="rail__foot">
        <span>{{ share(account) }}% del total</span>
        <span v-if="account.id === props.selectedId" class="rail__viewing">
          <i class="fa-solid fa-circle-check" aria-hidden="true" /> Viendo
        </span>
        <span v-else-if="Number(account.availableBalance) !== Number(account.currentBalance)">
          {{ formatMoney(account.availableBalance) }} libre
        </span>
      </span>
    </button>
  </div>
</template>

<style scoped lang="scss">
.rail {
  // Móvil: carrusel con snap para no apilar cuatro bloques altos.
  display: flex;
  gap: $sp-2;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding-bottom: $sp-2;
  margin-bottom: -$sp-2;
  @include scrollbar(4px, rgba($white, 0.2));

  @include md {
    flex-wrap: wrap;
    overflow: visible;
    padding-bottom: 0;
    margin-bottom: 0;
  }
}

.rail__item {
  @include flex-col($sp-2);
  position: relative;
  flex: 0 0 72%;
  scroll-snap-align: start;
  padding: $sp-3 $sp-4;
  text-align: left;
  cursor: pointer;
  border-radius: $radius-md;
  border: 1px solid rgba($white, 0.12);
  background: rgba($white, 0.04);
  color: $white;
  transition:
    background $transition-fast,
    border-color $transition-fast;

  // Desde tablet reparten el ancho entre todas, con un mínimo legible.
  @include md {
    flex: 1 1 190px;
  }

  // El hover no debe pisar a la cuenta seleccionada.
  &:hover:not(.is-selected) {
    background: rgba($white, 0.09);
  }

  &:focus-visible {
    outline: 2px solid rgba($white, 0.7);
    outline-offset: 2px;
  }

  // Estado seleccionado: fondo claro sobre el panel oscuro, sin depender del color del borde.
  &.is-selected {
    background: $white;
    border-color: $white;
    color: $primary-dark;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.28);

    .rail__name {
      color: $primary-dark;
    }

    .rail__last4,
    .rail__foot {
      color: rgba($primary-dark, 0.55);
    }

    .rail__bar {
      background: rgba($primary-dark, 0.1);
    }
  }
}

.rail__head {
  @include flex(row, space-between, baseline, $sp-2);
}

.rail__name {
  font-size: $fs-xs;
  font-weight: 600;
  color: rgba($white, 0.9);
  @include truncate;
}

.rail__last4 {
  font-size: 0.65rem;
  color: rgba($white, 0.45);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

.rail__balance {
  font-size: $fs-lg;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}

.rail__bar {
  display: block;
  height: 3px;
  border-radius: $radius-full;
  background: rgba($white, 0.14);
  overflow: hidden;
}

.rail__fill {
  display: block;
  height: 100%;
  background: $primary;
  border-radius: $radius-full;
  transition: width 0.6s $ease-out;
}

.rail__foot {
  @include flex(row, space-between, center, $sp-2);
  font-size: 0.65rem;
  color: rgba($white, 0.5);
  font-variant-numeric: tabular-nums;
}

.rail__viewing {
  @include flex(row, flex-start, center, 4px);
  color: $primary;
  font-weight: 700;
}

@media (prefers-reduced-motion: reduce) {
  .rail__item,
  .rail__fill {
    transition: none;
  }
}
</style>
