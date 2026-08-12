<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { BaseBadge, BaseButton, BaseEmptyState, BaseSkeleton } from '@/components/base'
import { useFormat } from '@/composables/useFormat'
import { archiveReasonIcon, archiveReasonTone, lifetimeLabel } from '@/config/archiveReasons'
import type { BadgeVariant } from '@/components/base'
import type { ChurnReport } from '@/types'

type RecentRow = ChurnReport['recent'][number]

const props = withDefaults(
  defineProps<{ items?: RecentRow[]; loading?: boolean }>(),
  { items: () => [], loading: false },
)

const emit = defineEmits<{ 'edit-dates': [row: RecentRow] }>()

const router = useRouter()
const { formatMoney, formatDateShort } = useFormat()

const rows = computed(() =>
  [...props.items].sort(
    (a, b) => new Date(b.archivedAt).getTime() - new Date(a.archivedAt).getTime(),
  ),
)

function toneOf(row: RecentRow): BadgeVariant {
  return archiveReasonTone(row.reason) as BadgeVariant
}

function open(row: RecentRow) {
  router.push({ name: 'ClientDetail', params: { id: row._id } })
}
</script>

<template>
  <section class="recent">
    <header class="recent__head">
      <h2><i class="fa-solid fa-clock-rotate-left" aria-hidden="true" /> Bajas recientes</h2>
      <span v-if="rows.length" class="recent__count">{{ rows.length }}</span>
    </header>

    <div v-if="loading && !rows.length" class="recent__skeleton">
      <BaseSkeleton v-for="n in 4" :key="n" height="76px" />
    </div>

    <BaseEmptyState
      v-else-if="!rows.length"
      icon="fa-solid fa-face-smile"
      title="Ninguna baja registrada"
      message="Todos tus clientes siguen activos. Cuando des de baja a alguien aparecerá aquí."
    />

    <TransitionGroup v-else name="list" tag="ul" class="recent__list">
      <li v-for="row in rows" :key="row._id" class="row" @click="open(row)">
        <div class="row__main">
          <p class="row__name">{{ row.name }}</p>
          <p class="row__date">
            <i class="fa-solid fa-calendar-xmark" aria-hidden="true" />
            Baja el {{ formatDateShort(row.archivedAt) }} · {{ lifetimeLabel(row.lifetimeDays) }}
          </p>
        </div>

        <div class="row__figures">
          <span class="row__loss">-{{ formatMoney(row.amount) }} / mes</span>
          <span class="row__revenue">{{ formatMoney(row.lifetimeRevenue) }} cobrados</span>
        </div>

        <div class="row__tail">
          <BaseBadge :variant="toneOf(row)" :icon="archiveReasonIcon(row.reason)">
            {{ row.label }}
          </BaseBadge>
          <span v-if="row.attachmentsCount" class="row__files">
            <i class="fa-solid fa-paperclip" aria-hidden="true" /> {{ row.attachmentsCount }}
          </span>
          <BaseButton
            size="sm"
            variant="ghost"
            icon="fa-solid fa-calendar-pen"
            :aria-label="`Corregir fechas de ${row.name}`"
            @click.stop="emit('edit-dates', row)"
          >
            Fechas
          </BaseButton>
          <i class="fa-solid fa-chevron-right row__chevron" aria-hidden="true" />
        </div>
      </li>
    </TransitionGroup>
  </section>
</template>

<style scoped lang="scss">
.recent {
  @include card($sp-5);
  @include flex-col($sp-4);
}

.recent__head {
  @include flex-between(center, $sp-3);

  h2 {
    @include flex(row, flex-start, center, $sp-2);
    font-size: $fs-md;
    font-weight: 800;
    color: $primary-dark;

    i {
      color: $primary;
    }
  }
}

.recent__count {
  @include flex-center;
  min-width: 26px;
  height: 26px;
  padding: 0 $sp-2;
  border-radius: $radius-full;
  background: rgba($primary, 0.12);
  color: $primary;
  font-size: $fs-xs;
  font-weight: 800;
}

.recent__skeleton,
.recent__list {
  @include flex-col($sp-2);
  list-style: none;
}

.row {
  @include flex-col($sp-2);
  @include pressable;
  padding: $sp-3;
  border-radius: $radius-sm;
  border: 1px solid $border-color;
  background: $surface;
  cursor: pointer;
  transition: border-color $transition-base, background $transition-base;

  &:hover {
    border-color: rgba($primary, 0.4);
    background: rgba($primary, 0.04);
  }

  @include lg {
    display: grid;
    grid-template-columns: 1.5fr 1fr auto;
    align-items: center;
    gap: $sp-4;
  }
}

.row__name {
  font-weight: 700;
  color: $primary-dark;
}

.row__date {
  @include flex(row, flex-start, center, $sp-2);
  font-size: $fs-xs;
  color: $text-secondary;
  margin-top: 2px;
  flex-wrap: wrap;
}

.row__figures {
  @include flex-col(2px);
}

.row__loss {
  font-weight: 800;
  color: $alert-error;
  font-size: $fs-sm;
}

.row__revenue {
  font-size: $fs-xs;
  color: $alert-success;
}

.row__tail {
  @include flex(row, flex-start, center, $sp-2);
  flex-wrap: wrap;

  @include lg {
    justify-content: flex-end;
  }
}

.row__files {
  @include flex(row, flex-start, center, $sp-1);
  font-size: $fs-xs;
  color: $text-secondary;
}

.row__chevron {
  font-size: $fs-xs;
  color: $text-secondary;
}
</style>
