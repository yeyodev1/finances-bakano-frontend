<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { BaseButton, BaseCard, BaseInput, BaseSelect, BaseSkeleton, BaseSwitch } from '@/components/base'
import EmailChipsInput from './EmailChipsInput.vue'
import api from '@/services/api.service'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import { apiErrorMessage } from '@/stores/clients'
import type { NotificationSettings, SelectOption } from '@/types'

const toast = useToast()
const { confirm } = useConfirm()

const loading = ref(true)
const saving = ref(false)
const testing = ref(false)
const testEmail = ref('')

const form = reactive<NotificationSettings>({
  fromEmail: '',
  replyTo: '',
  recipients: [],
  alwaysTo: [],
  ccEmails: [],
  toggles: {
    paymentRegistered: true,
    reminderBefore: true,
    overdue: true,
    deactivation: true,
    monthlySummary: true,
  },
  reminderDaysBefore: 3,
  graceDays: 5,
  warnBeforeDeactivationDays: 2,
  autoDeactivateEnabled: true,
  sendHour: 9,
})

const hourOptions = computed<SelectOption[]>(() =>
  Array.from({ length: 24 }, (_, h) => ({
    value: h,
    label: `${String(h).padStart(2, '0')}:00`,
    icon: 'fa-solid fa-clock',
  })),
)

const toggleFields = [
  { key: 'paymentRegistered', label: 'Pago registrado', icon: 'fa-solid fa-hand-holding-dollar', description: 'Se envía cuando registras un pago.' },
  { key: 'reminderBefore', label: 'Recordatorio previo', icon: 'fa-solid fa-bell', description: 'Aviso antes de la fecha de vencimiento.' },
  { key: 'overdue', label: 'Cobro en mora', icon: 'fa-solid fa-triangle-exclamation', description: 'Aviso cuando un cobro vence sin pago.' },
  { key: 'deactivation', label: 'Desactivación de espacio', icon: 'fa-solid fa-power-off', description: 'Aviso al desactivar el espacio del cliente.' },
  { key: 'monthlySummary', label: 'Resumen mensual', icon: 'fa-solid fa-chart-pie', description: 'Reporte del cierre del mes.' },
] as const

async function load() {
  loading.value = true
  try {
    const data = await api.getNotificationSettings()
    Object.assign(form, data, { toggles: { ...form.toggles, ...(data.toggles || {}) } })
    testEmail.value = data.recipients?.[0] || ''
  } catch (error) {
    toast.error('No se pudieron cargar las notificaciones', apiErrorMessage(error))
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function save() {
  const ok = await confirm({
    title: 'Guardar notificaciones',
    message: 'Se aplicarán los cambios a todos los correos automáticos del sistema.',
    confirmLabel: 'Guardar',
    variant: 'primary',
  })
  if (!ok) return

  saving.value = true
  try {
    const data = await api.updateNotificationSettings({ ...form })
    Object.assign(form, data)
    toast.success('Notificaciones guardadas', 'La configuración se aplicó correctamente.')
  } catch (error) {
    toast.error('No se pudo guardar', apiErrorMessage(error))
  } finally {
    saving.value = false
  }
}

async function sendTest() {
  const to = testEmail.value.trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    toast.warning('Email inválido', 'Escribe un correo válido para la prueba.')
    return
  }

  testing.value = true
  try {
    await api.sendTestEmail(to)
    toast.success('Correo de prueba enviado', `Revisa la bandeja de ${to}.`)
  } catch (error) {
    toast.error('No se pudo enviar el correo', apiErrorMessage(error))
  } finally {
    testing.value = false
  }
}
</script>

<template>
  <div class="notif">
    <div v-if="loading" class="notif__skeleton">
      <BaseSkeleton v-for="n in 3" :key="n" height="200px" />
    </div>

    <template v-else>
      <p class="notif__note">
        <i class="fa-solid fa-circle-info" aria-hidden="true" />
        Todos los correos se envían siempre con copia a <strong>dreyes@bakano.ec</strong>.
      </p>

      <BaseCard title="Destinatarios">
        <div class="stack">
          <EmailChipsInput v-model="form.recipients" label="Destinatarios principales" />
          <EmailChipsInput v-model="form.ccEmails" label="Con copia (CC)" />
          <div class="grid">
            <BaseInput v-model="form.fromEmail" label="Remitente" placeholder="finanzas@bakano.ec" />
            <BaseInput v-model="form.replyTo" label="Responder a" placeholder="dreyes@bakano.ec" />
          </div>
        </div>
      </BaseCard>

      <BaseCard title="Tipos de correo">
        <div class="stack">
          <BaseSwitch
            v-for="field in toggleFields"
            :key="field.key"
            v-model="form.toggles[field.key]"
            :label="field.label"
            :description="field.description"
          />
        </div>
      </BaseCard>

      <BaseCard title="Tiempos y mora">
        <div class="grid grid--3">
          <BaseInput v-model="form.reminderDaysBefore" type="number" label="Días de recordatorio previo" />
          <BaseInput v-model="form.graceDays" type="number" label="Días de gracia" />
          <BaseInput v-model="form.warnBeforeDeactivationDays" type="number" label="Aviso previo a desactivación (días)" />
          <BaseSelect v-model="form.sendHour" :options="hourOptions" label="Hora de envío" />
        </div>
        <BaseSwitch
          v-model="form.autoDeactivateEnabled"
          label="Auto-desactivación global"
          description="Si se apaga, ningún espacio se desactivará automáticamente por mora."
        />
      </BaseCard>

      <BaseCard title="Correo de prueba">
        <div class="test">
          <BaseInput v-model="testEmail" label="Enviar a" type="email" placeholder="tucorreo@bakano.ec" />
          <BaseButton variant="outline" icon="fa-solid fa-paper-plane" :loading="testing" @click="sendTest">
            Enviar correo de prueba
          </BaseButton>
        </div>
      </BaseCard>

      <div class="notif__actions">
        <BaseButton icon="fa-solid fa-floppy-disk" :loading="saving" @click="save">Guardar cambios</BaseButton>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.notif,
.notif__skeleton,
.stack {
  @include flex-col($sp-4);
}

.notif__note {
  @include flex(row, flex-start, center, $sp-3);
  padding: $sp-3 $sp-4;
  border-radius: $radius-sm;
  background: rgba($alert-info, 0.1);
  color: darken($alert-info, 16);
  font-size: $fs-xs;

  i {
    color: $alert-info;
  }
}

.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: $sp-3;

  @include md {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  &--3 {
    margin-bottom: $sp-4;

    @include lg {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }
}

.test {
  @include flex-col($sp-3);

  @include md {
    @include flex(row, flex-start, flex-end, $sp-3);

    > *:first-child {
      flex: 1;
    }
  }
}

.notif__actions {
  @include flex(row, flex-end, center, $sp-3);
}
</style>
