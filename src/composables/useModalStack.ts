/**
 * Pila de modales abiertos, compartida por todas las instancias.
 *
 * Cada BaseModal escucha `keydown` sobre `document`, así que con dos abiertos
 * —el diálogo de confirmación sobre otro modal— una sola pulsación de Escape
 * los cerraba ambos: `stopPropagation` no frena a los demás oyentes del MISMO
 * nodo, y `stopImmediatePropagation` dependería del orden de registro, que es
 * el inverso al que hace falta.
 *
 * Vive en un módulo aparte y no dentro de `<script setup>`, porque ahí el
 * código se ejecuta una vez por instancia y cada modal tendría su propia pila.
 */
const stack: string[] = []

export function useModalStack() {
  function push(id: string) {
    if (!stack.includes(id)) stack.push(id)
  }

  function remove(id: string) {
    const at = stack.indexOf(id)
    if (at !== -1) stack.splice(at, 1)
  }

  /** Solo el último abierto debe responder a Escape y al foco. */
  function isTopmost(id: string): boolean {
    return stack[stack.length - 1] === id
  }

  return { push, remove, isTopmost }
}
