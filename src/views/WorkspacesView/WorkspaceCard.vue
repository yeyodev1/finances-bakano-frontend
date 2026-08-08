<script setup lang="ts">
import { computed } from 'vue'
import { BaseAvatar, BaseBadge, BaseButton, BaseWorkspaceAvatar } from '@/components/base'
import { AccessOverrideBanner } from '@/components/access'
import { useFormat } from '@/composables/useFormat'
import { isOverrideActive } from '@/composables/useAccessOverride'
import type { Workspace } from '@/types'

const props = defineProps<{ workspace: Workspace }>()

const emit = defineEmits<{
  toggle: [workspace: Workspace]
  open: [workspace: Workspace]
  gallery: [workspace: Workspace]
  grant: [workspace: Workspace]
  revoke: [workspace: Workspace]
}>()

const { formatMoney } = useFormat()

const image = computed(
  () => props.workspace.imageUrl || props.workspace.logoUrl || props.workspace.pictureUrl || null,
)

const overrideActive = computed(() => isOverrideActive(props.workspace.accessOverride))
const alert = computed(() => Boolean(props.workspace.shouldBeClosed && props.workspace.isActive))

const status = computed<'active' | 'inactive' | 'override'>(() => {
  if (overrideActive.value) return 'override'
  return props.workspace.isActive ? 'active' : 'inactive'
})

const chips = computed(() =>
  [props.workspace.tipoNegocio, props.workspace.vertical].filter(Boolean) as string[],
)

const imagesCount = computed(() => props.workspace.images?.length ?? 0)
</script>

<template>
  <article class="ws-card" :class="{ 'ws-card--alert': alert, 'ws-card--override': overrideActive }">
    <div class="ws-card__top">
      <button
        type="button"
        class="ws-card__media"
        :title="imagesCount ? `Ver ${imagesCount} imágenes` : 'Ver imágenes del espacio'"
        @click="emit('gallery', workspace)"
      >
        <BaseWorkspaceAvatar
          :src="image"
          :name="workspace.name"
          size="xl"
          rounded="square"
          :status="status"
        />
        <span class="ws-card__media-hint">
          <i class="fa-solid fa-images" aria-hidden="true" />
          {{ imagesCount || (image ? 1 : 0) }}
        </span>
      </button>

      <div class="ws-card__id">
        <header class="ws-card__head">
          <h3>{{ workspace.name }}</h3>
          <BaseBadge
            :variant="workspace.isActive ? 'success' : 'danger'"
            :icon="workspace.isActive ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-xmark'"
          >
            {{ workspace.isActive ? 'Activo' : 'Inactivo' }}
          </BaseBadge>
        </header>

        <div v-if="workspace.adminName || workspace.adminEmail" class="ws-card__admin">
          <BaseAvatar
            :src="workspace.adminPhotoUrl"
            :name="workspace.adminName || workspace.adminEmail || ''"
            size="xs"
          />
          <span>{{ workspace.adminName || workspace.adminEmail }}</span>
        </div>

        <p v-if="workspace.pageName || workspace.instagramAccountName" class="ws-card__social">
          <span v-if="workspace.pageName">
            <i class="fa-brands fa-facebook" aria-hidden="true" /> {{ workspace.pageName }}
          </span>
          <span v-if="workspace.instagramAccountName">
            <i class="fa-brands fa-instagram" aria-hidden="true" /> @{{ workspace.instagramAccountName }}
          </span>
        </p>

        <div v-if="chips.length" class="ws-card__chips">
          <span v-for="chip in chips" :key="chip" class="ws-card__chip">{{ chip }}</span>
        </div>
      </div>
    </div>

    <p v-if="alert && !overrideActive" class="ws-card__warn">
      <i class="fa-solid fa-triangle-exclamation" aria-hidden="true" />
      Debería estar cerrado · {{ formatMoney(workspace.overdueAmount ?? 0) }} en mora
      <template v-if="workspace.maxDaysOverdue"> · {{ workspace.maxDaysOverdue }} días</template>
    </p>

    <AccessOverrideBanner
      compact
      :override="workspace.accessOverride"
      :overdue-amount="workspace.overdueAmount"
      :max-days-overdue="workspace.maxDaysOverdue"
      @revoke="emit('revoke', workspace)"
    />

    <div class="ws-card__client" :class="{ 'ws-card__client--empty': !workspace.client }">
      <template v-if="workspace.client">
        <button type="button" class="ws-card__link" @click="emit('open', workspace)">
          <i class="fa-solid fa-user" aria-hidden="true" /> {{ workspace.client.name }}
        </button>
        <span class="ws-card__amount">{{ formatMoney(workspace.client.amount) }}</span>
        <BaseBadge :variant="workspace.client.isActive ? 'success' : 'warning'">
          {{ workspace.client.isActive ? 'Cliente activo' : 'Cliente inactivo' }}
        </BaseBadge>
      </template>
      <template v-else>
        <i class="fa-solid fa-link-slash" aria-hidden="true" />
        <span>Sin cliente vinculado</span>
      </template>
    </div>

    <footer class="ws-card__foot">
      <BaseButton
        size="sm"
        :variant="workspace.isActive ? 'outline' : 'success'"
        :icon="workspace.isActive ? 'fa-solid fa-toggle-off' : 'fa-solid fa-toggle-on'"
        @click="emit('toggle', workspace)"
      >
        {{ workspace.isActive ? 'Desactivar espacio' : 'Activar espacio' }}
      </BaseButton>

      <BaseButton
        v-if="workspace.client && alert && !overrideActive"
        size="sm"
        variant="danger"
        icon="fa-solid fa-unlock-keyhole"
        @click="emit('grant', workspace)"
      >
        Abrir por excepción
      </BaseButton>
    </footer>
  </article>
</template>

<style scoped lang="scss">
.ws-card {
  @include card($sp-4);
  @include card-hover;
  @include flex-col($sp-3);
  border: 1px solid $border-color;
  transition: border-color $transition-base, box-shadow $transition-base, transform $transition-base;

  &--alert {
    border-color: rgba($alert-error, 0.55);
    box-shadow: 0 0 0 1px rgba($alert-error, 0.12);
  }

  &--override {
    border-color: rgba($alert-warning, 0.7);
  }
}

.ws-card__top {
  @include flex-col($sp-3);

  @include md {
    @include flex(row, flex-start, flex-start, $sp-4);
  }
}

.ws-card__media {
  position: relative;
  @include flex-center;
  @include pressable;
  align-self: flex-start;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: $radius-md;

  &:focus-visible {
    @include focus-ring;
  }
}

.ws-card__media-hint {
  @include flex-center($sp-1);
  position: absolute;
  right: -6px;
  top: -6px;
  padding: 2px $sp-2;
  border-radius: $radius-full;
  background: $primary-dark;
  color: $white;
  font-size: 0.62rem;
  font-weight: 800;
  opacity: 0;
  transform: translateY(-4px);
  transition: opacity $transition-base, transform $transition-base;

  .ws-card__media:hover & {
    opacity: 1;
    transform: translateY(0);
  }
}

.ws-card__id {
  @include flex-col($sp-2);
  flex: 1 1 auto;
  min-width: 0;
}

.ws-card__head {
  @include flex-between(flex-start, $sp-3);

  h3 {
    font-weight: 700;
    color: $primary-dark;
    font-size: $fs-md;
    @include truncate(2);
  }
}

.ws-card__admin {
  @include flex(row, flex-start, center, $sp-2);
  font-size: $fs-xs;
  color: $text-secondary;

  span {
    @include truncate;
  }
}

.ws-card__social {
  @include flex(row, flex-start, center, $sp-3);
  flex-wrap: wrap;
  font-size: $fs-xs;
  color: $text-secondary;

  span {
    @include flex(row, flex-start, center, $sp-1);
    @include truncate;
  }

  i {
    color: $secondary;
  }
}

.ws-card__chips {
  @include flex(row, flex-start, center, $sp-1);
  flex-wrap: wrap;
}

.ws-card__chip {
  padding: 2px $sp-2;
  border-radius: $radius-full;
  background: rgba($secondary, 0.12);
  color: $secondary-dark;
  font-size: 0.66rem;
  font-weight: 700;
  text-transform: capitalize;
}

.ws-card__warn {
  @include flex(row, flex-start, center, $sp-2);
  flex-wrap: wrap;
  padding: $sp-2 $sp-3;
  border-radius: $radius-sm;
  background: $alert-error-bg;
  color: $alert-error;
  font-size: $fs-xs;
  font-weight: 700;
}

.ws-card__client {
  @include flex(row, flex-start, center, $sp-3);
  flex-wrap: wrap;
  padding: $sp-3;
  border-radius: $radius-sm;
  background: rgba($secondary, 0.07);
  font-size: $fs-sm;

  &--empty {
    background: $surface-alt;
    color: $text-secondary;
    font-size: $fs-xs;
  }
}

.ws-card__link {
  @include flex(row, flex-start, center, $sp-2);
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  font-weight: 700;
  color: $primary-dark;
  transition: color $transition-base;

  &:hover {
    color: $primary;
  }
}

.ws-card__amount {
  font-weight: 700;
  color: $primary;
}

.ws-card__foot {
  @include flex(row, flex-start, center, $sp-2);
  flex-wrap: wrap;
  border-top: 1px solid $border-color;
  padding-top: $sp-3;
  margin-top: auto;
}
</style>
