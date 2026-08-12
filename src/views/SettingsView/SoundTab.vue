<script setup lang="ts">
import { computed } from 'vue'
import { BaseButton, BaseSwitch } from '@/components/base'
import { useSound, CUES, type CueName } from '@/composables/useSound'

/**
 * Preferencia de sonido. Vive en el navegador, no en el servidor: es de quien
 * usa la aplicación, no de la cuenta. Dos personas en la misma oficina pueden
 * quererlo distinto.
 */
const sound = useSound()

const volumePercent = computed(() => Math.round(sound.volume.value * 100))

/** Qué suena en cada momento, para poder probarlo antes de decidir. */
const EXAMPLES: Array<{ cue: CueName; label: string; when: string }> = [
  { cue: 'exito', label: 'Algo salió bien', when: 'Pago registrado, cliente creado' },
  { cue: 'error', label: 'Algo falló', when: 'No se pudo guardar, error del servidor' },
  { cue: 'aviso', label: 'Aviso', when: 'Falta un dato, revisa el formulario' },
  { cue: 'cobro', label: 'Entró dinero', when: 'Se registró un cobro' },
  { cue: 'navegar', label: 'Cambio de pantalla', when: 'Al ir de Cobros a Clientes' },
  { cue: 'trabajando', label: 'Empezó algo largo', when: 'Generar cobros, exportar CSV' },
  { cue: 'listo', label: 'Terminó', when: 'El archivo ya se puede descargar' },
]

function onToggle(value: boolean) {
  sound.setSoundEnabled(value)
}

function onVolume(event: Event) {
  sound.setSoundVolume(Number((event.target as HTMLInputElement).value) / 100)
}
</script>

<template>
  <div class="snd">
    <section class="snd__head">
      <div class="snd__intro">
        <h2 class="snd__title">
          <i class="fa-solid fa-volume-high" aria-hidden="true" /> Sonidos de la interfaz
        </h2>
        <p class="snd__desc">
          Un sonido corto según lo que pase: distinto si algo salió bien, si falló o si entró un
          cobro. Sirve para enterarte sin mirar la pantalla.
        </p>
      </div>

      <BaseSwitch
        :model-value="sound.enabled.value"
        label="Activar sonidos"
        @update:model-value="onToggle"
      />
    </section>

    <p class="snd__off">
      <i class="fa-solid fa-circle-info" aria-hidden="true" />
      <template v-if="sound.enabled.value">
        Están <strong>activados</strong>. Apaga el interruptor de arriba y dejan de sonar al
        instante — no hay que recargar ni guardar nada.
      </template>
      <template v-else>
        Están <strong>apagados</strong>. La aplicación no emite ningún sonido.
      </template>
    </p>

    <template v-if="sound.enabled.value">
      <section class="snd__block">
        <label class="snd__label" for="snd-vol">
          Volumen · <strong>{{ volumePercent }}%</strong>
        </label>
        <input
          id="snd-vol"
          class="snd__range"
          type="range"
          min="0"
          max="100"
          step="5"
          :value="volumePercent"
          @input="onVolume"
        />
        <p class="snd__hint">
          Solo afecta a este navegador. Si entras desde otro equipo, se configura por separado.
        </p>
      </section>

      <section class="snd__block">
        <h3 class="snd__sub">Qué suena en cada caso</h3>
        <ul class="snd__list">
          <li v-for="ex in EXAMPLES" :key="ex.cue" class="cue">
            <div class="cue__text">
              <span class="cue__label">{{ ex.label }}</span>
              <span class="cue__when">{{ ex.when }}</span>
            </div>
            <BaseButton
              size="sm"
              variant="ghost"
              icon="fa-solid fa-play"
              :aria-label="`Escuchar el sonido de ${ex.label}`"
              @click="sound.preview(CUES[ex.cue])"
            >
              Escuchar
            </BaseButton>
          </li>
        </ul>
      </section>
    </template>

    <p class="snd__note">
      <i class="fa-solid fa-shield-halved" aria-hidden="true" />
      El navegador no deja sonar nada hasta que hagas clic en algún sitio. Es una protección suya,
      no un fallo de la aplicación.
    </p>
  </div>
</template>

<style scoped lang="scss">
.snd { @include flex-col($sp-5); }

.snd__head {
  @include flex(row, space-between, flex-start, $sp-4);
  flex-wrap: wrap;
}

.snd__intro { flex: 1 1 260px; min-width: 0; }

.snd__title {
  @include flex(row, flex-start, center, $sp-2);
  font-size: $fs-md;
  font-weight: 800;
  color: $primary-dark;
  i { color: $primary; }
}

.snd__desc {
  font-size: $fs-xs;
  line-height: 1.55;
  color: $text-secondary;
  margin-top: $sp-1;
}

.snd__off {
  @include flex(row, flex-start, flex-start, $sp-2);
  padding: $sp-3 $sp-4;
  border-radius: $radius-sm;
  background: $alert-info-bg;
  border: 1px solid rgba($alert-info, 0.25);
  font-size: $fs-xs;
  line-height: 1.55;
  color: $text-secondary;

  i { color: $alert-info; margin-top: 2px; }
  strong { color: $primary-dark; }
}

.snd__block { @include flex-col($sp-2); }

.snd__label { @include label-text; }

.snd__range {
  width: 100%;
  max-width: 320px;
  accent-color: $primary;
  cursor: pointer;
  &:focus-visible { @include focus-ring; }
}

.snd__hint,
.snd__note {
  font-size: $fs-xs;
  line-height: 1.55;
  color: $text-secondary;
}

.snd__note {
  @include flex(row, flex-start, flex-start, $sp-2);
  padding-top: $sp-3;
  border-top: 1px solid $border-color;
  i { color: $text-secondary; margin-top: 2px; }
}

.snd__sub {
  font-size: $fs-xs;
  font-weight: 800;
  color: $primary-dark;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.snd__list { @include flex-col($sp-2); }

.cue {
  @include flex(row, space-between, center, $sp-3);
  flex-wrap: wrap;
  padding: $sp-3;
  border-radius: $radius-sm;
  border: 1px solid $border-color;
}

.cue__text { @include flex-col(2px); flex: 1 1 200px; min-width: 0; }
.cue__label { font-weight: 700; color: $primary-dark; font-size: $fs-sm; }
.cue__when { font-size: $fs-xs; color: $text-secondary; }
</style>
