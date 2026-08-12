import { fileURLToPath, URL } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'

/**
 * Identificador de esta compilación. Cambia en cada build, así que sirve para
 * saber si el navegador está corriendo una versión vieja.
 */
const BUILD_ID = String(Date.now())

/**
 * Publica `/version.json` con el id de la compilación.
 *
 * Los nombres de los bundles llevan hash, así que un usuario con la pestaña
 * abierta se queda con el JS antiguo indefinidamente: no hay forma de que se
 * entere de un despliegue nuevo salvo preguntando. Este archivo es esa pregunta,
 * y se sirve también en desarrollo para poder probar el aviso.
 */
function buildVersionPlugin(): Plugin {
  const payload = JSON.stringify({ buildId: BUILD_ID })

  return {
    name: 'bakano-build-version',

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/version.json')) return next()
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Cache-Control', 'no-store')
        res.end(payload)
      })
    },

    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: payload })
    },
  }
}

export default defineConfig({
  plugins: [vue(), buildVersionPlugin()],
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/styles/index.scss" as *;`,
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'esnext',
  },
})
