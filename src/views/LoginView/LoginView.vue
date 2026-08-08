<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { BaseButton, BaseInput } from '@/components/base'
import { useToast } from '@/composables/useToast'
import { useUserStore } from '@/stores/user'
import { useSettingsStore } from '@/stores/settings'
import LoginHero from './LoginHero.vue'

const router = useRouter()
const toast = useToast()
const userStore = useUserStore()
const settings = useSettingsStore()

const form = reactive({ email: '', password: '' })
const errors = reactive<{ email: string; password: string }>({ email: '', password: '' })
const formError = ref('')
const submitting = ref(false)

const isDev = import.meta.env.DEV

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const canSubmit = computed(
  () => !submitting.value && form.email.trim().length > 0 && form.password.length > 0,
)

function validate(): boolean {
  errors.email = ''
  errors.password = ''

  if (!form.email.trim()) errors.email = 'Ingresa tu correo'
  else if (!emailRe.test(form.email.trim())) errors.email = 'El correo no es válido'

  if (!form.password) errors.password = 'Ingresa tu contraseña'
  else if (form.password.length < 6) errors.password = 'Mínimo 6 caracteres'

  return !errors.email && !errors.password
}

async function handleSubmit() {
  formError.value = ''
  if (!validate()) return

  submitting.value = true
  try {
    const user = await userStore.login(form.email, form.password)
    void settings.load(true)
    toast.success('Bienvenido', user?.name ? `Hola, ${user.name.split(' ')[0]}` : undefined)
    await router.replace('/')
  } catch (err) {
    const message =
      (err as { message?: string })?.message || 'No pudimos iniciar sesión. Intenta de nuevo.'
    formError.value = message
    toast.error('No se pudo ingresar', message)
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  void settings.load()
})
</script>

<template>
  <div class="login">
    <LoginHero />

    <main class="login__panel">
      <div class="login__card">
        <header class="login__head" style="--i: 0">
          <img :src="settings.logoUrl" :alt="settings.appName" class="login__logo" />
          <h1 class="login__title">Ingresa a tu panel</h1>
          <p class="login__subtitle">Gestiona los cobros mensuales de Bakano.</p>
        </header>

        <form class="login__form" novalidate @submit.prevent="handleSubmit">
          <div style="--i: 1" class="login__field">
            <BaseInput
              v-model="form.email"
              label="Correo electrónico"
              type="email"
              placeholder="tucorreo@bakano.ec"
              autocomplete="email"
              icon="fa-solid fa-envelope"
              :error="errors.email"
              @blur="validate"
            />
          </div>

          <div style="--i: 2" class="login__field">
            <BaseInput
              v-model="form.password"
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              autocomplete="current-password"
              icon="fa-solid fa-lock"
              :error="errors.password"
              @blur="validate"
            />
          </div>

          <Transition name="fade-slide">
            <p v-if="formError" class="login__error" role="alert">
              <i class="fa-solid fa-circle-exclamation" />
              <span>{{ formError }}</span>
            </p>
          </Transition>

          <div style="--i: 3" class="login__field">
            <BaseButton
              type="submit"
              variant="primary"
              size="lg"
              block
              :loading="submitting"
              :disabled="!canSubmit"
            >
              Ingresar
            </BaseButton>
          </div>
        </form>

        <p v-if="isDev" class="login__hint" style="--i: 4">
          <i class="fa-solid fa-flask" />
          Entorno de desarrollo — usa las credenciales que te compartió el equipo.
        </p>
      </div>
    </main>
  </div>
</template>

<style scoped lang="scss">
.login {
  @include flex(row, flex-start, stretch);
  flex: 1 1 auto;
  min-height: 100dvh;
  background: $surface-alt;
}

.login__panel {
  @include flex-center;
  flex: 1 1 auto;
  padding: $sp-6 $sp-4;

  @include md {
    padding: $sp-10;
  }
}

.login__card {
  width: 100%;
  max-width: 400px;
  @include flex-col($sp-5);
}

.login__head,
.login__field,
.login__hint {
  animation: login-in 0.45s $ease-out backwards;
  animation-delay: calc(var(--i, 0) * 0.07s);
}

.login__head {
  @include flex-col($sp-2);
  align-items: flex-start;
  text-align: left;
}

.login__logo {
  height: 46px;
  width: auto;
  margin-bottom: $sp-4;

  @include lg {
    display: none;
  }
}

.login__title {
  font-size: $fs-xl;
  letter-spacing: -0.02em;
}

.login__subtitle {
  font-size: $fs-sm;
  color: $text-secondary;
  margin: 0;
}

.login__form {
  @include flex-col($sp-4);
}

.login__field {
  position: relative;
}

.login__error {
  @include flex(row, flex-start, center, $sp-2);
  padding: $sp-3;
  border-radius: $radius-sm;
  background: $alert-error-bg;
  border: 1px solid rgba($alert-error, 0.28);
  color: $alert-error;
  font-size: $fs-sm;
  font-weight: 600;
  margin: 0;
}

.login__hint {
  @include flex(row, flex-start, center, $sp-2);
  font-size: $fs-xs;
  color: $text-secondary;
  padding: $sp-3;
  border-radius: $radius-sm;
  border: 1px dashed $border-color;
  margin: 0;
}

@keyframes login-in {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
</style>
