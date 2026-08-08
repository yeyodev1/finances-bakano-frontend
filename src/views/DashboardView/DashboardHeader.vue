<script setup lang="ts">
import { computed, ref } from 'vue'
import { BaseButton, BaseMonthPicker } from '@/components/base'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import { useFormat } from '@/composables/useFormat'
import { useDashboardStore } from '@/stores/dashboard'
import { useUserStore } from '@/stores/user'

const dashboard = useDashboardStore()
const userStore = useUserStore()
const toast = useToast()
const { confirm } = useConfirm()
const { formatPeriod } = useFormat()

const generating = ref(false)

const canGenerate = computed(() => userStore.user?.role !== 'viewer')

const period = computed({
  get: () => dashboard.period,
  set: (value: string) => dashboard.setPeriod(value),
})

const periodLabel = computed(() => formatPeriod(dashboard.period))

async function handleGenerate() {
  const ok = await confirm({
    title: 'Generar cobros del mes',
    message: `Se crearán las facturas pendientes de ${periodLabel.value} para los clientes activos. ¿Continuar?`,
    confirmLabel: 'Generar',
    cancelLabel: 'Cancelar',
    variant: 'primary',
  })
  if (!ok) return

  generating.value = true
  try {
    const res = await dashboard.generate()
    if (res.created > 0) {
      toast.success(
        `${res.created} cobro${res.created === 1 ? '' : 's'} generado${res.created === 1 ? '' : 's'}`,
        res.skipped ? `${res.skipped} ya existían.` : undefined,
      )
    } else {
      toast.info('Nada que generar', 'Todos los cobros del mes ya estaban creados.')
    }
  } catch (err) {
    toast.error(
      'No se pudieron generar los cobros',
      (err as { message?: string })?.message || 'Intenta nuevamente.',
    )
  } finally {
    generating.value = false
  }
}
</script>

<template>
  <header class="dash-header">
    <div class="dash-header__intro">
      <span class="dash-header__eyebrow">Resumen del período</span>
      <h1 class="dash-header__title">{{ periodLabel }}</h1>
    </div>

    <div class="dash-header__actions">
      <BaseMonthPicker v-model="period" class="dash-header__picker" />

      <BaseButton
        variant="ghost"
        icon="fa-solid fa-rotate"
        :loading="dashboard.loading"
        aria-label="Actualizar"
        @click="dashboard.refresh()"
      >
        Actualizar
      </BaseButton>

      <BaseButton
        v-if="canGenerate"
        variant="primary"
        icon="fa-solid fa-wand-magic-sparkles"
        :loading="generating"
        @click="handleGenerate"
      >
        Generar cobros del mes
      </BaseButton>
    </div>
  </header>
</template>

<style scoped lang="scss">
.dash-header {
  @include flex-col($sp-4);
  margin-bottom: $sp-5;

  @include md {
    @include flex-between(flex-end, $sp-4);
    flex-wrap: wrap;
  }
}

.dash-header__intro {
  @include flex-col(2px);
  min-width: 0;
}

.dash-header__eyebrow {
  @include label-text;
}

.dash-header__title {
  font-size: $fs-xl;
  text-transform: capitalize;
  letter-spacing: -0.02em;

  @include md {
    font-size: $fs-2xl;
  }
}

.dash-header__actions {
  @include flex(row, flex-start, center, $sp-2);
  flex-wrap: wrap;

  @include md {
    justify-content: flex-end;
  }
}

.dash-header__picker {
  flex: 1 1 160px;
  min-width: 150px;

  @include md {
    flex: 0 0 auto;
  }
}
</style>
