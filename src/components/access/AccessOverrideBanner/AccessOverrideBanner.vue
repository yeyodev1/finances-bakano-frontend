<script setup lang="ts">
import { computed } from 'vue'
import { BaseButton } from '@/components/base'
import { useFormat } from '@/composables/useFormat'
import { isOverrideActive, overrideExpiryLabel } from '@/composables/useAccessOverride'
import type { AccessOverride } from '@/types'

const props = withDefaults(
  defineProps<{
    override?: AccessOverride | null
    clientName?: string
    overdueAmount?: number
    maxDaysOverdue?: number
    compact?: boolean
    loading?: boolean
    showAction?: boolean
  }>(),
  { override: null, clientName: '', overdueAmount: 0, maxDaysOverdue: 0, compact: false, loading: false, showAction: true },
)

const emit = defineEmits<{ revoke: []; open: [] }>()

const { formatMoney, formatDateShort } = useFormat()

const active = computed(() => isOverrideActive(props.override))
const expiry = computed(() => overrideExpiryLabel(props.override))
const indefinite = computed(() => !props.override?.until)
</script>

<template>
  <Transition name="fade-slide">
    <aside v-if="active" class="ovb" :class="{ 'ovb--compact': compact }" role="alert">
      <span class="ovb__pulse" aria-hidden="true" />

      <div class="ovb__body">
        <p class="ovb__title">
          <i class="fa-solid fa-triangle-exclamation" aria-hidden="true" />
          Acceso abierto por excepción — este espacio debería estar cerrado
        </p>

        <p v-if="clientName" class="ovb__client">
          <button v-if="!compact" type="button" class="ovb__client-link" @click="emit('open')">
            {{ clientName }}
          </button>
          <span v-else>{{ clientName }}</span>
        </p>

        <p v-if="override?.reason" class="ovb__reason">
          <i class="fa-solid fa-quote-left" aria-hidden="true" /> {{ override.reason }}
        </p>

        <ul class="ovb__meta">
          <li v-if="override?.grantedByName">
            <i class="fa-solid fa-user-shield" aria-hidden="true" /> Autorizó {{ override.grantedByName }}
          </li>
          <li v-if="override?.grantedAt">
            <i class="fa-solid fa-calendar-day" aria-hidden="true" /> Desde {{ formatDateShort(override.grantedAt) }}
          </li>
          <li :class="{ 'ovb__meta-strong': indefinite }">
            <i :class="indefinite ? 'fa-solid fa-infinity' : 'fa-solid fa-hourglass-half'" aria-hidden="true" />
            {{ expiry }}
          </li>
          <li v-if="overdueAmount">
            <i class="fa-solid fa-sack-dollar" aria-hidden="true" /> Adeuda {{ formatMoney(overdueAmount) }}
          </li>
          <li v-if="maxDaysOverdue">
            <i class="fa-solid fa-clock" aria-hidden="true" /> {{ maxDaysOverdue }} días de mora
          </li>
        </ul>
      </div>

      <div v-if="showAction" class="ovb__actions">
        <BaseButton
          size="sm"
          variant="danger"
          icon="fa-solid fa-lock"
          :loading="loading"
          @click="emit('revoke')"
        >
          Cerrar acceso
        </BaseButton>
      </div>
    </aside>
  </Transition>
</template>

<style scoped lang="scss">
.ovb {
  position: relative;
  @include flex-col($sp-3);
  padding: $sp-4;
  padding-left: $sp-5;
  border-radius: $radius-md;
  overflow: hidden;
  background: linear-gradient(135deg, $alert-error-bg 0%, $alert-warning-bg 100%);
  border: 1px solid rgba($alert-error, 0.35);

  @include md {
    @include flex-between(center, $sp-4);
  }

  &--compact {
    padding: $sp-3;
    padding-left: $sp-4;
  }
}

.ovb__pulse {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 5px;
  background: $alert-error;
  animation: ovb-pulse 1.8s $ease-in-out infinite;
}

@keyframes ovb-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

.ovb__body {
  @include flex-col($sp-2);
  flex: 1 1 auto;
  min-width: 0;
}

.ovb__title {
  @include flex(row, flex-start, center, $sp-2);
  font-size: $fs-sm;
  font-weight: 800;
  color: $alert-error;
  line-height: 1.35;
}

.ovb__client {
  font-size: $fs-sm;
  font-weight: 700;
  color: $primary-dark;
}

.ovb__client-link {
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  font: inherit;
  color: $primary-dark;
  text-decoration: underline dotted;
  transition: color $transition-base;

  &:hover {
    color: $primary;
  }

  &:focus-visible {
    @include focus-ring;
  }
}

.ovb__reason {
  font-size: $fs-xs;
  color: $text-secondary;
  line-height: 1.5;
  white-space: pre-line;

  i {
    color: $alert-error;
    margin-right: $sp-1;
  }
}

.ovb__meta {
  @include flex(row, flex-start, center, $sp-3);
  flex-wrap: wrap;
  list-style: none;
  font-size: $fs-xs;
  color: $text-secondary;

  li {
    @include flex(row, flex-start, center, $sp-1);
  }

  i {
    color: $alert-warning;
  }
}

.ovb__meta-strong {
  font-weight: 800;
  color: $alert-error;

  i {
    color: $alert-error;
  }
}

.ovb__actions {
  @include flex(row, flex-start, center, $sp-2);
  flex: none;
}
</style>
