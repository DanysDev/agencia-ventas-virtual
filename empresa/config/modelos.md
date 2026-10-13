# Modelos y respaldo de la empresa

Misma cadena que la agencia. Todo gratis: Google AI Studio + OpenCode ZEN.

## Cadena de modelos

| Orden | Modelo | Notas |
|-------|--------|-------|
| Principal | `google/gemini-3.8-flash` | Fijado en cada agente y en `.opencode/opencode.json` |
| Respaldo 1 | `opencode/big-pickle` | ZEN gratis, el más fuerte |
| Respaldo 2 | `opencode/nemotron-3-ultra-free` | ZEN gratis, segundo |

El respaldo entra solo si el principal falla de forma recuperable (429, 5xx,
timeout, red). Ver detalle y límites en `agencia/config/modelos.md`.

## Cobertura del plugin

`.opencode/plugins/model-fallback.ts` cubre a los 7 de la agencia + los 9 de la
empresa (Director Técnico y 8 especialistas). Si cambias el principal, cambia
los `model:` de los 16 agentes + `opencode.json` + `CADENA_POR_DEFECTO`.
