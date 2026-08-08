<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { BaseButton, BaseCard, BaseInput, BaseSelect, BaseSkeleton } from '@/components/base'
import api from '@/services/api.service'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import { apiErrorMessage } from '@/stores/clients'
import type { AppSettings, SelectOption } from '@/types'

const toast = useToast()
const { confirm } = useConfirm()

const loading = ref(true)
const saving = ref(false)
const uploading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const preview = ref<string | null>(null)

const form = reactive<AppSettings>({
  appName: '',
  logoUrl: '',
  iconUrl: '',
  brandColors: {},
  currency: 'USD',
  timezone: 'America/Guayaquil',
})

const CURRENCY_OPTIONS: SelectOption[] = [
  { value: 'USD', label: 'Dólar estadounidense (USD)', icon: 'fa-solid fa-dollar-sign' },
  { value: 'EUR', label: 'Euro (EUR)', icon: 'fa-solid fa-euro-sign' },
  { value: 'COP', label: 'Peso colombiano (COP)', icon: 'fa-solid fa-dollar-sign' },
  { value: 'MXN', label: 'Peso mexicano (MXN)', icon: 'fa-solid fa-dollar-sign' },
  { value: 'PEN', label: 'Sol peruano (PEN)', icon: 'fa-solid fa-money-bill' },
]

const TIMEZONE_OPTIONS: SelectOption[] = [
  { value: 'America/Guayaquil', label: 'Guayaquil (GMT-5)', icon: 'fa-solid fa-earth-americas' },
  { value: 'America/Bogota', label: 'Bogotá (GMT-5)', icon: 'fa-solid fa-earth-americas' },
  { value: 'America/Lima', label: 'Lima (GMT-5)', icon: 'fa-solid fa-earth-americas' },
  { value: 'America/Mexico_City', label: 'Ciudad de México (GMT-6)', icon: 'fa-solid fa-earth-americas' },
  { value: 'America/New_York', label: 'Nueva York (GMT-4)', icon: 'fa-solid fa-earth-americas' },
  { value: 'Europe/Madrid', label: 'Madrid (GMT+2)', icon: 'fa-solid fa-earth-europe' },
]

const logoSrc = computed(() => preview.value || form.logoUrl || '')

async function load() {
  loading.value = true
  try {
    const data = await api.getAppSettings()
    Object.assign(form, data)
  } catch (error) {
    toast.error('No se pudo cargar la marca', apiErrorMessage(error))
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function save() {
  const ok = await confirm({
    title: 'Guardar marca',
    message: 'Se actualizarán el nombre, la moneda y la zona horaria de la aplicación.',
    confirmLabel: 'Guardar',
    variant: 'primary',
  })
  if (!ok) return

  saving.value = true
  try {
    const data = await api.updateAppSettings({
      appName: form.appName,
      currency: form.currency,
      timezone: form.timezone,
    })
    Object.assign(form, data)
    toast.success('Marca actualizada', 'Los cambios se guardaron correctamente.')
  } catch (error) {
    toast.error('No se pudo guardar', apiErrorMessage(error))
  } finally {
    saving.value = false
  }
}

async function upload(files: FileList | null) {
  const file = files?.[0]
  if (!file) return

  const ok = await confirm({
    title: 'Actualizar logo',
    message: `Se reemplazará el logo actual por "${file.name}".`,
    confirmLabel: 'Subir logo',
    variant: 'primary',
  })
  if (!ok) {
    if (fileInput.value) fileInput.value.value = ''
    return
  }

  uploading.value = true
  preview.value = URL.createObjectURL(file)
  try {
    const formData = new FormData()
    formData.append('logo', file)
    const data = await api.uploadLogo(formData)
    Object.assign(form, data)
    toast.success('Logo actualizado', 'El nuevo logo ya está disponible.')
  } catch (error) {
    preview.value = null
    toast.error('No se pudo subir el logo', apiErrorMessage(error))
  } finally {
    uploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}
</script>

<template>
  <div class="brand">
    <div v-if="loading" class="brand__skeleton">
      <BaseSkeleton height="220px" />
      <BaseSkeleton height="200px" />
    </div>

    <template v-else>
      <BaseCard title="Logo">
        <div class="logo">
          <div class="logo__preview">
            <img v-if="logoSrc" :src="logoSrc" alt="Logo actual" />
            <i v-else class="fa-solid fa-image" aria-hidden="true" />
          </div>

          <div class="logo__actions">
            <p class="logo__hint">Formato PNG o SVG con fondo transparente. Tamaño recomendado 512×512.</p>
            <input
              ref="fileInput"
              type="file"
              class="logo__input"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              @change="upload(($event.target as HTMLInputElement).files)"
            />
            <BaseButton variant="outline" icon="fa-solid fa-upload" :loading="uploading" @click="fileInput?.click()">
              Subir nuevo logo
            </BaseButton>
          </div>
        </div>
      </BaseCard>

      <BaseCard title="Aplicación">
        <div class="grid">
          <BaseInput v-model="form.appName" label="Nombre de la app" placeholder="Bakano Finanzas" />
          <BaseSelect v-model="form.currency" :options="CURRENCY_OPTIONS" label="Moneda" />
          <BaseSelect v-model="form.timezone" :options="TIMEZONE_OPTIONS" label="Zona horaria" />
        </div>
      </BaseCard>

      <div class="brand__actions">
        <BaseButton icon="fa-solid fa-floppy-disk" :loading="saving" @click="save">Guardar cambios</BaseButton>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.brand,
.brand__skeleton {
  @include flex-col($sp-4);
}

.logo {
  @include flex-col($sp-4);

  @include md {
    @include flex(row, flex-start, center, $sp-5);
  }
}

.logo__preview {
  @include flex-center;
  width: 132px;
  height: 132px;
  border-radius: $radius-md;
  border: 1px solid $border-color;
  background: $surface-alt;
  overflow: hidden;
  flex: none;

  img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }

  i {
    font-size: $fs-2xl;
    color: $text-secondary;
  }
}

.logo__actions {
  @include flex-col($sp-3);
  align-items: flex-start;
}

.logo__hint {
  font-size: $fs-xs;
  color: $text-secondary;
  line-height: 1.5;
}

.logo__input {
  display: none;
}

.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: $sp-3;

  @include lg {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.brand__actions {
  @include flex(row, flex-end, center, $sp-3);
}
</style>
