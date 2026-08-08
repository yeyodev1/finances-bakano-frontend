<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { BaseButton, BaseInput, BaseModal, BaseSelect, BaseSwitch } from '@/components/base'
import { useToast } from '@/composables/useToast'
import { apiErrorMessage } from '@/stores/clients'
import { ROLE_OPTIONS, useUsersStore } from '@/stores/users'
import type { User, UserRole } from '@/types'

const props = defineProps<{ modelValue: boolean; user: User | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; saved: [] }>()

const store = useUsersStore()
const toast = useToast()

const form = reactive({
  name: '',
  email: '',
  role: 'admin' as UserRole,
  password: '',
  receivesNotifications: true,
})

const errors = reactive<Record<string, string>>({})

const isEdit = computed(() => !!props.user)
const title = computed(() => (isEdit.value ? 'Editar usuario' : 'Nuevo usuario'))

watch(
  () => [props.modelValue, props.user] as const,
  ([open, user]) => {
    if (!open) return
    Object.keys(errors).forEach((k) => delete errors[k])
    form.name = user?.name || ''
    form.email = user?.email || ''
    form.role = user?.role || 'admin'
    form.password = ''
    form.receivesNotifications = user?.receivesNotifications ?? true
  },
  { immediate: true },
)

function validate(): boolean {
  Object.keys(errors).forEach((k) => delete errors[k])
  if (!form.name.trim()) errors.name = 'El nombre es obligatorio'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Email inválido'
  if (!isEdit.value && form.password.trim().length < 8)
    errors.password = 'La contraseña debe tener al menos 8 caracteres'
  if (isEdit.value && form.password && form.password.trim().length < 8)
    errors.password = 'La contraseña debe tener al menos 8 caracteres'
  return Object.keys(errors).length === 0
}

async function submit() {
  if (!validate()) {
    toast.warning('Revisa el formulario', 'Corrige los campos marcados.')
    return
  }

  try {
    if (props.user) {
      await store.update(props.user._id, {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        receivesNotifications: form.receivesNotifications,
        ...(form.password ? { password: form.password } : {}),
      })
      toast.success('Usuario actualizado', form.name.trim())
    } else {
      await store.create({
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        receivesNotifications: form.receivesNotifications,
        password: form.password,
      })
      toast.success('Usuario creado', form.name.trim())
    }
    emit('saved')
    emit('update:modelValue', false)
  } catch (error) {
    toast.error('No se pudo guardar el usuario', apiErrorMessage(error))
  }
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    :title="title"
    size="sm"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <form class="uform" @submit.prevent="submit">
      <BaseInput v-model="form.name" label="Nombre" placeholder="Diego Reyes" :error="errors.name" required />
      <BaseInput v-model="form.email" label="Email" type="email" placeholder="diego@bakano.ec" :error="errors.email" required />
      <BaseSelect v-model="form.role" :options="ROLE_OPTIONS" label="Rol" />
      <BaseInput
        v-model="form.password"
        label="Contraseña"
        type="password"
        :placeholder="isEdit ? 'Déjala vacía para no cambiarla' : 'Mínimo 8 caracteres'"
        :error="errors.password"
      />
      <BaseSwitch
        v-model="form.receivesNotifications"
        label="Recibe notificaciones"
        description="Se incluirá en los correos automáticos de cobros y pagos."
      />
    </form>

    <template #footer>
      <BaseButton variant="ghost" icon="fa-solid fa-xmark" @click="emit('update:modelValue', false)">
        Cancelar
      </BaseButton>
      <BaseButton icon="fa-solid fa-floppy-disk" :loading="store.saving" @click="submit">
        {{ isEdit ? 'Guardar cambios' : 'Crear usuario' }}
      </BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
.uform {
  @include flex-col($sp-4);
}
</style>
