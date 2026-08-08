<script setup lang="ts">
import { computed } from 'vue'
import { BaseButton, BaseCurrencyInput, BaseDayPicker, BaseInput } from '@/components/base'
import { useFormat } from '@/composables/useFormat'
import type { ClientSplit } from '@/types'

const props = defineProps<{
  modelValue: ClientSplit[]
  total: number
}>()

const emit = defineEmits<{ 'update:modelValue': [value: ClientSplit[]] }>()

const { formatMoney } = useFormat()

const splits = computed(() => props.modelValue)

const sum = computed(() => splits.value.reduce((acc, s) => acc + Number(s.amount || 0), 0))
const mismatch = computed(() => splits.value.length > 0 && Math.abs(sum.value - Number(props.total || 0)) > 0.009)

function update(index: number, patch: Partial<ClientSplit>) {
  const next = splits.value.map((item, i) => (i === index ? { ...item, ...patch } : item))
  emit('update:modelValue', next)
}

function add() {
  const remaining = Math.max(Number(props.total || 0) - sum.value, 0)
  emit('update:modelValue', [
    ...splits.value,
    { label: `Parte ${splits.value.length + 1}`, amount: Number(remaining.toFixed(2)), day: null },
  ])
}

function removeAt(index: number) {
  emit('update:modelValue', splits.value.filter((_, i) => i !== index))
}
</script>

<template>
  <div class="splits">
    <header class="splits__head">
      <div>
        <p class="splits__title"><i class="fa-solid fa-scissors" aria-hidden="true" /> Cobros divididos</p>
        <p class="splits__hint">Opcional. Divide el monto mensual en varios cobros con su propia fecha.</p>
      </div>
      <BaseButton size="sm" variant="outline" icon="fa-solid fa-plus" @click="add">Añadir parte</BaseButton>
    </header>

    <TransitionGroup name="list" tag="div" class="splits__list">
      <div v-for="(split, index) in splits" :key="`split-${index}`" class="split">
        <BaseInput
          :model-value="split.label ?? ''"
          label="Etiqueta"
          placeholder="Primera quincena"
          @update:model-value="(v: string | number | null) => update(index, { label: String(v ?? '') })"
        />
        <BaseCurrencyInput
          :model-value="split.amount"
          label="Monto"
          @update:model-value="(v: number | null) => update(index, { amount: Number(v ?? 0) })"
        />
        <BaseDayPicker
          :model-value="split.day ?? null"
          label="Día de cobro"
          @update:model-value="(v: number | null) => update(index, { day: v })"
        />
        <button type="button" class="split__remove" title="Quitar parte" @click="removeAt(index)">
          <i class="fa-solid fa-xmark" aria-hidden="true" />
        </button>
      </div>
    </TransitionGroup>

    <Transition name="fade">
      <p v-if="splits.length" class="splits__sum" :class="{ 'splits__sum--warn': mismatch }">
        <i :class="mismatch ? 'fa-solid fa-triangle-exclamation' : 'fa-solid fa-circle-check'" aria-hidden="true" />
        Suma de partes: {{ formatMoney(sum) }} / Monto mensual: {{ formatMoney(total) }}
      </p>
    </Transition>
  </div>
</template>

<style scoped lang="scss">
.splits {
  @include flex-col($sp-3);
  padding: $sp-4;
  border: 1px dashed $border-strong;
  border-radius: $radius-md;
  background: rgba($secondary, 0.04);
}

.splits__head {
  @include flex-col($sp-3);

  @include md {
    @include flex-between(center, $sp-3);
  }
}

.splits__title {
  font-weight: 700;
  color: $primary-dark;
  font-size: $fs-sm;

  i {
    color: $secondary;
    margin-right: $sp-2;
  }
}

.splits__hint {
  font-size: $fs-xs;
  color: $text-secondary;
  margin-top: 2px;
}

.splits__list {
  @include flex-col($sp-3);
}

.split {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: $sp-2;
  align-items: end;
  padding: $sp-3;
  background: $surface;
  border: 1px solid $border-color;
  border-radius: $radius-sm;

  @include md {
    grid-template-columns: 1.4fr 1fr 1fr auto;
    gap: $sp-3;
  }
}

.split__remove {
  @include flex-center;
  @include pressable;
  width: 38px;
  height: 38px;
  border-radius: $radius-xs;
  border: 1px solid $border-color;
  background: transparent;
  color: $text-secondary;
  cursor: pointer;
  transition: background $transition-base, color $transition-base;

  &:hover {
    background: $alert-error-bg;
    color: $alert-error;
    border-color: rgba($alert-error, 0.4);
  }

  &:focus-visible {
    @include focus-ring($alert-error);
  }
}

.splits__sum {
  @include flex(row, flex-start, center, $sp-2);
  font-size: $fs-xs;
  font-weight: 600;
  color: $alert-success;

  &--warn {
    color: $alert-warning;
  }
}
</style>
