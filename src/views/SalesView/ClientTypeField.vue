<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { BaseButton, BaseInput, BaseSelect } from '@/components/base'
import { useToast } from '@/composables/useToast'
import { apiErrorMessage, useClientsStore } from '@/stores/clients'
import { useUserStore } from '@/stores/user'
import type { SelectOption } from '@/types'

/**
 * Tipo de cliente para ventas y objetivo: se elige de la lista o se ESCRIBE uno
 * nuevo ahí mismo. El vendedor describe el cliente con sus palabras
 * ("Restaurante de mariscos", "Clínica dental"); obligarlo a salir a crear la
 * categoría en otra pantalla es la forma segura de que la venta quede sin tipo.
 */
const props = withDefaults(
  defineProps<{
    modelValue: string | null
    label?: string
    placeholder?: string
    hint?: string
    error?: string
    size?: 'sm' | 'md' | 'lg'
    required?: boolean
    clearable?: boolean
    disabled?: boolean
    /** Ids que no se pueden elegir (ya usados en otra línea del objetivo). */
    exclude?: string[]
    /** Marca estos ids como "Está en el objetivo" y los sube al principio. */
    highlight?: string[]
  }>(),
  {
    label: 'Tipo de cliente',
    placeholder: '¿Qué tipo de negocio es?',
    hint: '',
    error: '',
    size: 'md',
    required: false,
    clearable: true,
    disabled: false,
    exclude: () => [],
    highlight: () => [],
  },
)
const emit = defineEmits<{ 'update:modelValue': [value: string | null]; created: [id: string] }>()

const clients = useClientsStore()
const user = useUserStore()
const toast = useToast()

const canCreate = computed(() => user.role === 'admin' || user.role === 'superadmin')
const writing = ref(false)
const newName = ref('')
const saving = ref(false)

onMounted(() => {
  if (!clients.categories.length) clients.fetchCategories().catch(() => undefined)
})

const options = computed<SelectOption[]>(() => {
  const excluded = new Set(props.exclude)
  const marked = new Set(props.highlight)
  return clients.categories
    .filter((c) => (c.isActive || c._id === props.modelValue) && !excluded.has(c._id))
    .map((c) => ({
      value: c._id,
      label: c.name,
      icon: c.icon || 'fa-solid fa-tag',
      color: c.color,
      description: marked.size ? (marked.has(c._id) ? 'Está en el objetivo' : 'Fuera del objetivo') : undefined,
    }))
    .sort((a, b) => {
      if (marked.size) {
        const ai = marked.has(String(a.value)) ? 0 : 1
        const bi = marked.has(String(b.value)) ? 0 : 1
        if (ai !== bi) return ai - bi
      }
      return a.label.localeCompare(b.label, 'es', { sensitivity: 'base' })
    })
})

const model = computed<string | number | null>({
  get: () => props.modelValue ?? null,
  set: (value) => emit('update:modelValue', value ? String(value) : null),
})

function startWriting() {
  newName.value = ''
  writing.value = true
}

async function create() {
  const name = newName.value.trim()
  if (name.length < 2) {
    toast.warning('Nombre muy corto', 'El tipo necesita al menos dos letras.')
    return
  }

  // Si ya existe uno igual (sin tildes ni mayúsculas), se usa ese: nada de duplicados.
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()
  const existing = clients.categories.find((c) => norm(c.name) === norm(name))
  if (existing) {
    emit('update:modelValue', existing._id)
    writing.value = false
    toast.info('Ese tipo ya existía', `Se usó "${existing.name}".`)
    return
  }

  saving.value = true
  try {
    const created = await clients.createCategory({ name })
    emit('update:modelValue', created._id)
    emit('created', created._id)
    writing.value = false
    toast.success('Tipo creado', created.name)
  } catch (error) {
    toast.error('No se pudo crear el tipo', apiErrorMessage(error))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="type">
    <template v-if="!writing">
      <BaseSelect
        v-model="model"
        :options="options"
        :label="label"
        :placeholder="placeholder"
        :hint="hint"
        :error="error"
        :size="size"
        :required="required"
        :clearable="clearable"
        :disabled="disabled"
        icon="fa-solid fa-tag"
        searchable
        empty-text="No hay un tipo así. Escríbelo abajo."
      />
      <button v-if="canCreate && !disabled" class="type__write" type="button" @click="startWriting">
        <i class="fa-solid fa-pen" aria-hidden="true" /> Escribir un tipo nuevo
      </button>
    </template>

    <div v-else class="type__new">
      <BaseInput
        v-model="newName"
        :label="label"
        placeholder="Escribe el tipo: restaurante, clínica, ferretería…"
        :size="size"
        @keyup.enter="create"
        @keyup.esc="writing = false"
      />
      <div class="type__new-actions">
        <BaseButton :size="size === 'lg' ? 'md' : 'sm'" icon="fa-solid fa-check" :loading="saving" @click="create">
          Usar este tipo
        </BaseButton>
        <BaseButton :size="size === 'lg' ? 'md' : 'sm'" variant="ghost" icon="fa-solid fa-xmark" @click="writing = false">
          Volver a la lista
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.type { @include flex-col($sp-1); min-width: 0; }

.type__write {
  @include flex(row, flex-start, center, $sp-1);
  align-self: flex-start;
  font-size: $fs-xs;
  font-weight: 600;
  color: $primary;
  cursor: pointer;

  &:hover { opacity: 0.75; }
  &:focus-visible { @include focus-ring; }
}

.type__new { @include flex-col($sp-2); }

.type__new-actions {
  @include flex(row, flex-start, center, $sp-2);
  flex-wrap: wrap;
}
</style>
