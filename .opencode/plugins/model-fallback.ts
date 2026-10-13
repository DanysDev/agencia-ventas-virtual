/**
 * Respaldo de modelos por agente — OpenCode V2.
 *
 * OpenCode V2 solo admite UN modelo por agente (campo `model:` en el frontmatter).
 * Este plugin añade la cadena de respaldo: si el modelo principal falla por algo
 * recuperable (cuota agotada, 429, 5xx, timeout, red…), cambia el modelo de la
 * sesión al siguiente de la cadena y reintenta.
 *
 * Cadena por defecto (la que usan los 7 agentes de la agencia):
 *   1) principal : google/gemini-3.8-flash         (Google AI Studio — capa gratis)
 *   2) respaldo 1: opencode/big-pickle             (OpenCode ZEN, gratis)
 *   3) respaldo 2: opencode/nemotron-3-ultra-free  (OpenCode ZEN, gratis)
 *
 * Extra importante (comprobado en la v2.0.26):
 *  - Los SUBAGENTES sí usan su `model:` del frontmatter (corren en sesión hija).
 *  - Una sesión PRIMARIA no lo usa: arranca con el modelo por defecto de la
 *    config. Por eso `.opencode/opencode.json` fija `google/gemini-3.8-flash`
 *    como modelo por defecto del proyecto.
 *  - Y aun así, si quien falla es un agente de la agencia y su modelo NO está en
 *    la cadena (p.ej. un `freellmapi/auto` heredado de la config global),
 *    forzamos el primer eslabón (Google). Así acaban siempre en la cadena buena.
 *
 * Notas honestas:
 *  - Los respaldos de ZEN NO ven imágenes. Si Google falla en un paso que mira
 *    fotos (Analista de Producto / Creativo Visual), ese paso se degrada.
 *  - Solo afecta a los agentes de la agencia; tus sesiones normales no se tocan.
 *  - Para volver al principal basta con abrir una sesión nueva.
 *
 * Trazas: si `AGENCIA_FALLBACK_DEBUG` no es "0", escribe en
 * `/tmp/opencode/model-fallback.log`. Ponlo a "0" para silenciarlo.
 */
import { appendFileSync } from "node:fs"
import { Plugin } from "@opencode/plugin"

type ModelRef = { providerID: string; id: string }

/** [ principal, respaldo 1, respaldo 2 ] */
const CADENA_POR_DEFECTO: ModelRef[] = [
  { providerID: "google", id: "gemini-3.8-flash" },
  { providerID: "opencode", id: "big-pickle" },
  { providerID: "opencode", id: "nemotron-3-ultra-free" },
]

/** Los 7 agentes de la agencia + los 9 de la empresa: a ellos sí les aplicamos la cadena. */
const AGENTES_AGENCIA = new Set([
  "director-general",
  "analista-producto",
  "analista-mercado-precio",
  "redactor-ventas",
  "creativo-visual",
  "asistente-comercial",
  "control-calidad",
  "director-tecnico",
  "investigador-stack",
  "analista-requerimientos",
  "arquitecto-software",
  "disenador-uxui",
  "desarrollador-fullstack",
  "ingeniero-testing",
  "control-calidad-soft",
  "devops-documentador",
])

/** Cadenas específicas por agente (opcional). Si falta, usa la cadena por defecto. */
const CADENAS: Record<string, ModelRef[]> = {}

/** Retraso antes del reintento con el respaldo (ms). */
const RETRASO_MS = 700

const RUTA_TRAZA = "/tmp/opencode/model-fallback.log"

function traza(linea: string) {
  if (process.env.AGENCIA_FALLBACK_DEBUG === "0") return
  try {
    appendFileSync(RUTA_TRAZA, `${new Date().toISOString()} ${linea}\n`)
  } catch {
    /* si no se puede escribir, no pasa nada */
  }
}

/** ¿El error es de los que se arreglan probando otro modelo? */
function esReintentable(error: {
  type?: string
  message?: string
  status?: number
}): boolean {
  const tipo = String(error?.type ?? "").toLowerCase()
  const msj = String(error?.message ?? "").toLowerCase()
  const st = Number(error?.status ?? 0)

  if (st === 408 || st === 409 || st === 425 || st === 429 || st >= 500) return true

  if (
    /(rate|quota|overload|timeout|unavailab|network|transport|capacity|congest|exhaust|refus|server)/.test(
      tipo,
    )
  ) {
    return true
  }

  if (
    /(quota|rate limit|exceeded|overloaded|timed out|timeout|econnreset|econnrefused|connection ?refused|fetch failed|socket hang up|getaddrinfo|unavailable|\b(50[0-9]|429)\b)/.test(
      msj,
    )
  ) {
    return true
  }

  return false
}

function igual(a: ModelRef, m: { providerID?: string; id?: string }): boolean {
  return a.providerID === m?.providerID && a.id === m?.id
}

export default Plugin.define({
  id: "agencia-model-fallback",
  async setup(ctx) {
    traza("plugin cargado")

    await ctx.session.hook("retry", async (event) => {
      const actual = `${event.model?.providerID}/${event.model?.id}`
      const cadena =
        CADENAS[event.agent] ??
        (AGENTES_AGENCIA.has(event.agent) ? CADENA_POR_DEFECTO : null)

      if (!cadena) {
        traza(`ignorado: "${event.agent}" no es agente de la agencia`)
        return
      }

      const reintentable = esReintentable(event.error)
      traza(
        `fallo en ${actual} (intento ${event.attempt}) tipo=${event.error?.type} status=${
          event.error?.status ?? "-"
        } reintentable=${reintentable} :: ${String(event.error?.message ?? "").slice(0, 120)}`,
      )
      if (!reintentable) return

      const i = cadena.findIndex((m) => igual(m, event.model))

      // Modelo fuera de la cadena (típico: el global `freellmapi/auto`, porque la
      // app no aplica el `model:` del agente). Forzamos el eslabón principal.
      const destino = i === -1 ? cadena[0] : cadena[i + 1]
      const etiqueta = i === -1 ? "FUERA DE CADENA -> principal" : "CAMBIO"

      if (!destino) {
        traza(`cadena agotada en ${actual}; no cambio de modelo`)
        return
      }

      const ref = `${destino.providerID}/${destino.id}`
      try {
        await ctx.session.switchModel({
          sessionID: event.sessionID,
          model: { providerID: destino.providerID, id: destino.id },
        })
        event.decision = { retry: true, delay: RETRASO_MS }
        traza(`${etiqueta} ${actual} -> ${ref} (sesión ${event.sessionID})`)
      } catch (e: any) {
        traza(`ERROR al cambiar a ${ref}: ${String(e?.message ?? e)}`)
      }
    })
  },
})
