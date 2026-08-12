<script setup lang="ts">
import { computed } from 'vue'
import { BaseButton, BaseCurrencyInput, BaseInput, BaseSelect } from '@/components/base'
import { useFormat } from '@/composables/useFormat'
import { SALE_ITEM_KIND_OPTIONS, SUGGESTED_CONCEPTS } from '@/config/saleOptions'
import type { SaleItem } from '@/types'

/**
 * Desglose de lo vendido. El vendedor negocia la mensualidad (400, 300, 250…) y
 * suele sumar extras puntuales tipo "página web": sin este detalle solo quedaría
 * un total que no dice qué se ofreció ni a qué precio se cerró.
 */
const props = defineProps<{ modelValue: SaleItem[] }>()
const emit = defineEmits<{ 'update:modelValue': [value: SaleItem[]] }>()

const { formatMoney } = useFormat()

const total = computed(() =>
  props.modelValue.reduce((acc, item) => acc + Number(item.amount || 0), 0),
)

const recurring = computed(() =>
  props.modelValue
    .filter((i) => i.kind === 'recurrente')
    .reduce((acc, i) => acc + Number(i.amount || 0), 0),
)

const oneOff = computed(() => total.value - recurring.value)

function update(index: number, patch: Partial<SaleItem>) {
  const next = props.modelValue.map((item, i) => (i === index ? { ...item, ...patch } : item))
  emit('update:modelValue', next)
}

function add(concept = '', kind: SaleItem['kind'] = 'unico') {
  emit('update:modelValue', [...props.modelValue, { concept, description: '', amount: 0, kind }])
}

function remove(index: number) {
  emit(
    'update:modelValue',
    props.modelValue.filter((_, i) => i !== index),
  )
}
</script>

<template>
  <section class="items">
    <header class="items__head">
      <h3 class="items__title">
        <i class="fa-solid fa-list-check" aria-hidden="true" /> Qué se vendió
      </h3>
      <div class="items__quick">
        <BaseButton
          v-for="s in SUGGESTED_CONCEPTS"
          :key="s.concept"
          size="sm"
          variant="ghost"
          icon="fa-solid fa-plus"
          @click="add(s.concept, s.kind)"
        >
          {{ s.concept }}
        </BaseButton>
      </div>
    </header>

    <p v-if="!modelValue.length" class="items__empty">
      <i class="fa-solid fa-circle-info" aria-hidden="true" />
      Añade cada cosa que se vendió con su precio. Ejemplo: «Mensualidad · $400» y «Página web ·
      $500». El total del acuerdo se calcula solo.
    </p>

    <ul v-else class="items__list">
      <li v-for="(item, index) in modelValue" :key="index" class="item">
        <div class="item__row">
          <BaseInput
            :model-value="item.concept"
            label="Concepto"
            placeholder="Mensualidad, página web…"
            @update:model-value="update(index, { concept: String($event) })"
          />
          <BaseSelect
            :model-value="item.kind"
            :options="SALE_ITEM_KIND_OPTIONS"
            label="Tipo"
            @update:model-value="update(index, { kind: ($event as SaleItem['kind']) || 'unico' })"
          />
          <BaseCurrencyInput
            :model-value="item.amount"
            label="Precio"
            @update:model-value="update(index, { amount: Number($event) })"
          />
          <BaseButton
            variant="ghost"
            icon="fa-solid fa-trash"
            :aria-label="`Quitar ${item.concept || 'concepto'}`"
            @click="remove(index)"
          />
        </div>

        <BaseInput
          :model-value="item.description ?? ''"
          label="Qué incluye (opcional)"
          placeholder="Alcance de lo ofrecido: publicaciones, reuniones, entregables…"
          @update:model-value="update(index, { description: String($event) })"
        />
      </li>
    </ul>

    <BaseButton size="sm" variant="outline" icon="fa-solid fa-plus" @click="add()">
      Añadir concepto
    </BaseButton>

    <footer v-if="modelValue.length" class="items__total">
      <span>
        Recurrente <strong>{{ formatMoney(recurring) }}</strong> · Puntual
        <strong>{{ formatMoney(oneOff) }}</strong>
      </span>
      <span class="items__grand">Total {{ formatMoney(total) }}</span>
    </footer>
  </section>
</template>

<style scoped lang="scss">
.items {
  @include flex-col($sp-3);
  padding: $sp-4;
  border-radius: $radius-sm;
  border: 1px solid $border-color;
  background: rgba($primary-light, 0.35);
}

.items__head {
  @include flex(row, space-between, center, $sp-3);
  flex-wrap: wrap;
}

.items__title {
  @include flex(row, flex-start, center, $sp-2);
  font-size: $fs-xs;
  font-weight: 800;
  color: $primary-dark;
  text-transform: uppercase;
  letter-spacing: 0.04em;

  i { color: $primary; }
}

.items__quick {
  @include flex(row, flex-start, center, $sp-1);
  flex-wrap: wrap;
}

.items__empty {
  @include flex(row, flex-start, flex-start, $sp-2);
  font-size: $fs-xs;
  line-height: 1.55;
  color: $text-secondary;

  i { color: $alert-info; margin-top: 2px; }
}

.items__list { @include flex-col($sp-3); }

.item {
  @include flex-col($sp-2);
  padding: $sp-3;
  border-radius: $radius-xs;
  background: $surface;
  border: 1px solid $border-color;
}

.item__row {
  @include flex(row, flex-start, flex-end, $sp-2);
  flex-wrap: wrap;

  > *:not(:last-child) { flex: 1 1 150px; min-width: 0; }
  > *:last-child { flex: none; }
}

.items__total {
  @include flex(row, space-between, center, $sp-3);
  flex-wrap: wrap;
  padding-top: $sp-3;
  border-top: 1px solid $border-color;
  font-size: $fs-xs;
  color: $text-secondary;

  strong { color: $primary-dark; font-weight: 700; }
}

.items__grand {
  font-size: $fs-md;
  font-weight: 800;
  color: $primary-dark;
}
</style>
