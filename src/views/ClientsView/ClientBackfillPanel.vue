<script setup lang="ts">
import { BaseDatePicker, BaseSwitch } from '@/components/base'
import { useFormat } from '@/composables/useFormat'

defineProps<{
  startDate: string
  markPaidUntil: string | null
  generate: boolean
}>()

const emit = defineEmits<{
  'update:markPaidUntil': [value: string | null]
  'update:generate': [value: boolean]
}>()

const { formatDate } = useFormat()
</script>

<template>
  <Transition name="fade-slide">
    <section class="backfill">
      <header class="backfill__head">
        <i class="fa-solid fa-clock-rotate-left" aria-hidden="true" />
        <div>
          <p class="backfill__title">Este cliente empezó antes del mes actual</p>
          <p class="backfill__text">
            Inicio: <strong>{{ formatDate(startDate) }}</strong>. Puedes crear los cobros de los meses
            anteriores y marcar como pagados los que ya se cobraron.
          </p>
        </div>
      </header>

      <BaseSwitch
        :model-value="generate"
        label="Generar cobros retroactivos"
        description="Crea un cobro por cada mes entre la fecha de inicio y hoy."
        @update:model-value="(v: boolean) => emit('update:generate', v)"
      />

      <Transition name="fade-slide">
        <BaseDatePicker
          v-if="generate"
          :model-value="markPaidUntil"
          label="Marcar como pagado hasta"
          placeholder="Selecciona la fecha"
          @update:model-value="(v: string | null) => emit('update:markPaidUntil', v)"
        />
      </Transition>
    </section>
  </Transition>
</template>

<style scoped lang="scss">
.backfill {
  @include flex-col($sp-3);
  padding: $sp-4;
  border-radius: $radius-md;
  border: 1px solid rgba($alert-warning, 0.4);
  background: $alert-warning-bg;
}

.backfill__head {
  @include flex(row, flex-start, flex-start, $sp-3);

  > i {
    font-size: $fs-lg;
    color: $alert-warning;
    flex: none;
    margin-top: 2px;
  }
}

.backfill__title {
  font-weight: 700;
  color: $primary-dark;
  font-size: $fs-sm;
}

.backfill__text {
  font-size: $fs-xs;
  color: $text-secondary;
  margin-top: $sp-1;
  line-height: 1.5;
}
</style>
