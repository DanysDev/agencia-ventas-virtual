# Modelos y respaldo de la agencia

Cómo están puestos los modelos de los 7 agentes y qué pasa cuando uno falla.
Todo gratis: Google AI Studio (capa gratis) + OpenCode ZEN (modelos gratis).

## Cadena de modelos

| Orden | Modelo | Proveedor | Notas |
|-------|--------|-----------|-------|
| Principal | `google/gemini-3.8-flash` | Google AI Studio | El mejor gratis de Google y **ve imágenes** |
| Respaldo 1 | `opencode/big-pickle` | OpenCode ZEN | Gratis, el más fuerte del ZEN |
| Respaldo 2 | `opencode/nemotron-3.5-lightning-free` | OpenCode ZEN | Gratis, segundo del ZEN |

El respaldo entra **solo si el principal falla** por algo que se arregla probando
otro modelo: cuota agotada (429), servidor sobrecargado (503), timeout, caída de
red, etc.

## Dónde está puesto

1. **Subagentes** (los 6 analistas/redactores): cada archivo
   `.opencode/agents/<nombre>.md` lleva `model: google/gemini-3.8-flash`.
   OpenCode V2 **sí aplica** este modelo cuando el Director los lanza como
   subagentes (corren en una sesión hija). ✅ Comprobado.
2. **Director General** (agente primario): V2 **no** aplica el `model:` del
   frontmatter a la sesión primaria; usa el modelo por defecto de la config. Por
   eso está fijado en `.opencode/opencode.json`:
   ```json
   { "model": "google/gemini-3.8-flash" }
   ```
3. **Cadena de respaldo**: `.opencode/plugins/model-fallback.ts`. Es un plugin
   local de V2 que engancha el evento `retry`; si un modelo de la cadena falla de
   forma recuperable, cambia el modelo de la sesión al siguiente y reintenta.
   - Si el agente que falla es de la agencia y su modelo **no** está en la cadena
     (p. ej. un `freellmapi/auto` heredado), lo fuerza al principal (Google).

## Reglas y límites (comprobados en la v2.0.26)

- ⚠️ **Nunca pongas `shell: deny` en un agente.** La capa gratis de ZEN rechaza
  la petición con `403 FreeTierError` («free tier can only be used from within
  OpenCode») cuando la herramienta `shell` no va en la petición. Si quieres
  frenar el shell, usa `effect: ask`, que sí funciona.
- `edit: deny` sí es seguro (los respaldos de ZEN funcionan con eso).
- Los modelos de ZEN **no ven imágenes**. Si Google falla en un paso que mira
  fotos (Analista de Producto, Creativo Visual), ese paso se degrada; hay que
  repetirlo cuando la cuota de Google se reinicie (se reinicia a diario).
- Los cortes de socket sin clasificar (`error.type = unknown`) no pasan por el
  hook de reintento: si la sesión muere así, hay que volver a lanzarla.
- La cuota gratis de Google AI Studio se agota con facilidad; el respaldo está
  para eso.

## Trazas y ajustes

- Traza del respaldo: `/tmp/opencode/model-fallback.log`
  (pon `AGENCIA_FALLBACK_DEBUG=0` para silenciarla).
- Para cambiar la cadena: edita la constante `CADENA_POR_DEFECTO` en
  `.opencode/plugins/model-fallback.ts` y, si cambias el principal, también los
  `model:` de los 7 agentes y `.opencode/opencode.json`.
- Cadenas por agente (opcional): el objeto `CADENAS` del plugin.