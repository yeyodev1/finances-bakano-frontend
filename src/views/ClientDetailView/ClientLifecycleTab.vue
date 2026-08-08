<script setup lang="ts">
import { computed, ref } from 'vue'
import { BaseBadge, BaseButton, BaseEmptyState } from '@/components/base'
import ClientAttachmentsGallery from './ClientAttachmentsGallery.vue'
import ClientAttachmentsModal from './ClientAttachmentsModal.vue'
import ClientReactivateModal from './ClientReactivateModal.vue'
import { useFormat } from '@/composables/useFormat'
import {
  archiveReasonIcon,
  archiveReasonLabel,
  archiveReasonTone,
  daysSince,
  lifetimeLabel,
} from '@/config/archiveReasons'
import type { BadgeVariant } from '@/components/base'
import type { Client, ClientLifecycleEntry } from '@/types'

const props = defineProps<{ client: Client }>()
const emit = defineEmits<{ refresh: [] }>()

const { formatMoney, formatDateTime } = useFormat()

const attachOpen = ref(false)
const reactivateOpen = ref(false)

const history = computed<ClientLifecycleEntry[]>(() =>
  [...(props.client.lifecycleHistory ?? [])].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  ),
)

const lifetimeDays = computed(
  () => Number(props.client.lifetimeDays ?? 0) || daysSince(props.client.startDate),
)

function isArchivedEvent(entry: ClientLifecycleEntry): boolean {
  return entry.action === 'archived'
}

function eventIcon(entry: ClientLifecycleEntry): string {
  return isArchivedEvent(entry) ? archiveReasonIcon(entry.reason) : 'fa-solid fa-rotate-left'
}

function eventVariant(entry: ClientLifecycleEntry): BadgeVariant {
  return (isArchivedEvent(entry) ? archiveReasonTone(entry.reason) : 'success') as BadgeVariant
}

function eventTitle(entry: ClientLifecycleEntry): string {
  return isArchivedEvent(entry) ? 'Baja del cliente' : 'Reactivación'
}

function onDone() {
  emit('refresh')
}
</script>

<template>
  <div class="lifecycle">
    <section class="lifecycle__summary">
      <div class="metric">
        <span class="metric__label">Duración como cliente</span>
        <span class="metric__value">{{ lifetimeLabel(lifetimeDays) }}</span>
      </div>
      <div class="metric">
        <span class="metric__label">Total cobrado histórico</span>
        <span class="metric__value metric__value--money">
          {{ formatMoney(client.lifetimeRevenue ?? 0) }}
        </span>
      </div>
      <div class="metric">
        <span class="metric__label">Documentos de respaldo</span>
        <span class="metric__value">{{ (client.archiveAttachments ?? []).length }}</span>
      </div>
    </section>

    <div class="lifecycle__actions">
      <BaseButton size="sm" variant="outline" icon="fa-solid fa-paperclip" @click="attachOpen = true">
        Añadir respaldos
      </BaseButton>
      <BaseButton
        v-if="client.isArchived"
        size="sm"
        variant="success"
        icon="fa-solid fa-rotate-left"
        @click="reactivateOpen = true"
      >
        Reactivar cliente
      </BaseButton>
    </div>

    <BaseEmptyState
      v-if="!history.length"
      icon="fa-solid fa-timeline"
      title="Sin eventos de ciclo de vida"
      message="Aquí aparecerán las bajas y reactivaciones del cliente, con sus motivos y respaldos."
    />

    <TransitionGroup v-else name="list" tag="ol" class="timeline">
      <li v-for="(entry, index) in history" :key="`${entry.at}-${index}`" class="event">
        <span class="event__dot" :class="isArchivedEvent(entry) ? 'event__dot--out' : 'event__dot--in'">
          <i :class="eventIcon(entry)" aria-hidden="true" />
        </span>

        <article class="event__card">
          <header class="event__head">
            <div class="event__title">
              <h3>{{ eventTitle(entry) }}</h3>
              <p class="event__date">{{ formatDateTime(entry.at) }}</p>
            </div>
            <BaseBadge v-if="entry.reason" :variant="eventVariant(entry)" :icon="archiveReasonIcon(entry.reason)">
              {{ archiveReasonLabel(entry.reason) }}
            </BaseBadge>
          </header>

          <p v-if="entry.notes" class="event__notes">{{ entry.notes }}</p>

          <ul class="event__facts">
            <li v-if="entry.durationDays !== undefined && entry.durationDays !== null">
              <i class="fa-solid fa-hourglass-half" aria-hidden="true" />
              {{ lifetimeLabel(entry.durationDays) }} al momento del evento
            </li>
            <li v-if="entry.revenueToDate !== undefined && entry.revenueToDate !== null">
              <i class="fa-solid fa-sack-dollar" aria-hidden="true" />
              {{ formatMoney(entry.revenueToDate) }} cobrados hasta la fecha
            </li>
            <li v-if="entry.byName">
              <i class="fa-solid fa-user-pen" aria-hidden="true" /> Registrado por {{ entry.byName }}
            </li>
          </ul>

          <ClientAttachmentsGallery
            v-if="(entry.attachments ?? []).length"
            :attachments="entry.attachments"
            compact
          />
        </article>
      </li>
    </TransitionGroup>

    <section v-if="(client.archiveAttachments ?? []).length" class="lifecycle__files">
      <h3 class="lifecycle__files-title">
        <i class="fa-solid fa-folder-open" aria-hidden="true" /> Todos los respaldos del cliente
      </h3>
      <ClientAttachmentsGallery :attachments="client.archiveAttachments" />
    </section>

    <ClientAttachmentsModal v-model="attachOpen" :client="client" @done="onDone" />
    <ClientReactivateModal v-model="reactivateOpen" :client="client" @done="onDone" />
  </div>
</template>

<style scoped lang="scss">
.lifecycle {
  @include flex-col($sp-4);
}

.lifecycle__summary {
  display: grid;
  grid-template-columns: 1fr;
  gap: $sp-3;

  @include md {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.metric {
  @include card($sp-4);
  @include flex-col($sp-1);
}

.metric__label {
  @include label-text;
}

.metric__value {
  font-size: $fs-md;
  font-weight: 800;
  color: $primary-dark;

  &--money {
    color: $alert-success;
  }
}

.lifecycle__actions {
  @include flex(row, flex-start, center, $sp-2);
  flex-wrap: wrap;
}

.timeline {
  @include flex-col($sp-4);
  list-style: none;
  position: relative;
  padding-left: $sp-6;

  &::before {
    content: '';
    position: absolute;
    left: 15px;
    top: 6px;
    bottom: 6px;
    width: 2px;
    background: $border-color;
  }
}

.event {
  position: relative;
}

.event__dot {
  @include flex-center;
  position: absolute;
  left: calc(-#{$sp-6} + 2px);
  top: $sp-4;
  width: 28px;
  height: 28px;
  border-radius: $radius-full;
  border: 2px solid $surface;
  font-size: 0.7rem;
  color: $white;
  z-index: 1;

  &--out {
    background: $alert-error;
  }

  &--in {
    background: $alert-success;
  }
}

.event__card {
  @include card($sp-4);
  @include flex-col($sp-3);
}

.event__head {
  @include flex-between(flex-start, $sp-3);
  flex-wrap: wrap;
}

.event__title h3 {
  font-size: $fs-md;
  font-weight: 700;
  color: $primary-dark;
}

.event__date {
  font-size: $fs-xs;
  color: $text-secondary;
  margin-top: 2px;
}

.event__notes {
  padding: $sp-3;
  border-radius: $radius-sm;
  background: $surface-alt;
  border-left: 3px solid rgba($primary, 0.4);
  font-size: $fs-sm;
  color: $text-secondary;
  line-height: 1.55;
  white-space: pre-line;
}

.event__facts {
  @include flex-col($sp-2);
  list-style: none;
  font-size: $fs-xs;
  color: $text-secondary;

  i {
    width: 16px;
    color: $secondary;
  }
}

.lifecycle__files {
  @include card($sp-4);
  @include flex-col($sp-3);
}

.lifecycle__files-title {
  @include flex(row, flex-start, center, $sp-2);
  @include label-text;
  color: $primary;
}
</style>
