<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { BaseButton, BaseInput, BaseSelect } from '@/components/base'
import { useToast } from '@/composables/useToast'
import { apiErrorMessage, useClientsStore } from '@/stores/clients'
import type { SelectOption } from '@/types'

/**
 * Selector de categoría con alta en el mismo sitio.
 *
 * Sin esto habría que salir a otra pantalla a crear el rubro y volver, y quien
 * está dando de alta un cliente acaba dejándolo sin categoría. El listado de
 * clientes por rubro solo sirve si asignarla cuesta un clic.
 */
const props = defineProps<{ modelValue: string | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: string | null] }>()

const clients = useClientsStore()
const toast = useToast()

const creating = ref(false)
const newName = ref('')
const saving = ref(false)

onMounted(() => {
  if (!clients.categories.length) clients.fetchCategories().catch(() => undefined)
})

const options = computed<SelectOption[]>(() => [
  { value: '', label: 'Sin categoría', icon: 'fa-solid fa-minus' },
  ...clients.categories.map((c) => ({
    value: c._id,
    label: c.name,
    icon: c.icon || 'fa-solid fa-tag',
    description: c.clientCount ? `${c.clientCount} cliente(s)` : undefined,
  })),
])

const model = computed<string | number | null>({
  get: () => props.modelValue ?? '',
  set: (value) => emit('update:modelValue', value ? String(value) : null),
})

async function create() {
  const name = newName.value.trim()
  if (name.length < 2) {
    toast.warning('Nombre muy corto', 'La categoría necesita al menos dos letras.')
    return
  }

  saving.value = true
  try {
    const created = await clients.createCategory({ name })
    // Queda seleccionada: es lo que se quería al crearla.
    emit('update:modelValue', created._id)
    newName.value = ''
    creating.value = false
    toast.success('Categoría creada', created.name)
  } catch (error) {
    toast.error('No se pudo crear la categoría', apiErrorMessage(error))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="cat">
    <BaseSelect
      v-if="!creating"
      v-model="model"
      :options="options"
      label="Categoría"
      placeholder="Sin categoría"
      icon="fa-solid fa-tag"
      hint="El rubro del cliente. Sirve para filtrar y agrupar."
      searchable
    />

    <div v-else class="cat__new">
      <BaseInput
        v-model="newName"
        label="Nueva categoría"
        placeholder="Restaurante, gimnasio, tienda…"
        @keyup.enter="create"
      />
      <BaseButton icon="fa-solid fa-check" :loading="saving" @click="create">Crear</BaseButton>
      <BaseButton variant="ghost" icon="fa-solid fa-xmark" @click="creating = false">
        Cancelar
      </BaseButton>
    </div>

    <button v-if="!creating" class="cat__add" type="button" @click="creating = true">
      <i class="fa-solid fa-plus" aria-hidden="true" /> Crear una categoría nueva
    </button>
  </div>
</template>

<style scoped lang="scss">
.cat { @include flex-col($sp-2); }

.cat__new {
  @include flex(row, flex-start, flex-end, $sp-2);
  flex-wrap: wrap;

  > *:first-child { flex: 1 1 200px; min-width: 0; }
}

.cat__add {
  @include flex(row, flex-start, center, $sp-1);
  align-self: flex-start;
  font-size: $fs-xs;
  font-weight: 600;
  color: $primary;
  cursor: pointer;

  &:hover { opacity: 0.75; }
  &:focus-visible { @include focus-ring; }
}
</style>
