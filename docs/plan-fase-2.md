# Plan · Fase 2 — Harness de la agencia + sistema web

> **Estado: propuesta para aprobar. Nada implementado.**
> Fecha: 2026-10-13 · Autor: Director General (con el gestor)

---

## 0. Cómo se usa este documento

1. El gestor lo lee, lo corrige y lo **aprueba**.
2. Cada hito se implementa en **una rama `feature/*`** y entra a `develop` por **Pull Request**.
3. Al cerrar cada bloque se sincroniza `main` (gitflow, ya montado).
4. Ningún hito rompe lo que ya funciona: la agencia sigue usable desde la app de OpenCode en todo momento.

---

## 1. Objetivo de la Fase 2

Pasar de *"la agencia vive dentro de un chat"* a *"un servicio corre la agencia y una web la consume"*, **sin reescribir el motor**: OpenCode V2 ya es el harness (loop, herramientas, permisos, contexto, sesiones, reintentos).

Tres resultados concretos:

| # | Resultado | Por qué importa |
|---|---|---|
| **A** | El pipeline de los 7 roles corre **headless** (un comando, sin UI) | Se puede automatizar, medir y reintentar |
| **B** | Las reglas de **dinero y privacidad pasan a código** puro y testeable | Hoy las calcula un LLM: ahí no puede haber errores |
| **C** | La **API** queda estable, versionada y documentada para que la **empresa de desarrollo** construya la web encima | Cada equipo trabaja contra un contrato, no contra suposiciones |

La web **no la construimos aquí**: la hará la **empresa virtual de desarrollo** del gestor.
Nuestra entrega es la API, su contrato y los mocks para que ellos trabajen en paralelo.

---

## 2. Alcance

### Dentro

- Núcleo determinista: comisión, precio, monedas, IDs, vales, validación de esquemas.
- Tools de plugin para que **los agentes usen ese núcleo** en vez de calcular.
- Pipeline headless de los 7 roles, con registro y reintentos.
- Servicio HTTP local: catálogo público, panel privado, estados del producto.
- **Contrato de integración** para la empresa de desarrollo: OpenAPI, esquemas, ejemplos, mocks y tests de contrato.
- Banco de pruebas (evals) con productos "de oro".

### Fuera (explícito, para no perder el foco)

- **La web del gestor.** La construye la **empresa virtual de desarrollo**; aquí entregamos la API y su contrato.
- **Publicar solo** en Revolico/Facebook (no hay API gratis y automatizar Facebook arriesga bloqueo).
- Cobros, pagos, facturación, multi-usuario, hosting público.
- **Reescribir el motor de agentes.** Descartado: perderíamos la capa gratis de ZEN
  (`403 FreeTierError — OpenCode's free tier can only be used from within OpenCode`, verificado en Fase 1).

---

## 3. Principios de diseño

1. **El código hace lo exacto; el LLM hace lo difuso.** Dinero, privacidad y validación = funciones puras.
2. **Los archivos siguen siendo la fuente de verdad.** La base de datos es un **índice derivado y reconstruible**.
3. **Privacidad por construcción, no por buena voluntad.** Si `publico.json` filtra un dato privado, **falla un test**, no un humano.
4. **Nada de magia con dinero.** Tasa USD/CUP en config **con fecha**; si está vieja, el sistema dice "por confirmar" y nunca inventa.
5. **Cada hito es reversible.** Se puede parar en cualquier punto sin dejar la agencia inservible.
6. **Contrato primero.** La API se documenta y se versiona **antes** de que la empresa de desarrollo toque la web.

---

## 4. Arquitectura

```
        ┌─── Web del gestor (la hace la empresa) ──────┐
        │   Panel interno        Catálogo público      │
        │   → cliente externo de nuestra API           │
        └───────────────┬──────────────────────────────┘
                        │ HTTP · contrato M5
        ┌───────────────▼──────────────────────────────┐
        │  Servicio "agencia" (M4)                     │
        │   ├─ API: /productos · /publico · /privado   │
        │   ├─ índice SQLite (derivado de archivos)    │
        │   └─ RPC: métodos agencia.*                  │
        └──────┬──────────────────────────┬────────────┘
               │ usa                      │ lanza
   ┌───────────▼────────────┐   ┌─────────▼─────────────────┐
   │ Núcleo (M1)            │   │ Pipeline headless (M3)    │
   │ agencia-core/          │   │ @opencode/client          │
   │ funciones puras +      │   │ Director → 6 subagentes   │
   │ esquemas + tests       │   └─────────┬─────────────────┘
   └───────────▲────────────┘             │
               │ importa                  │ corre sobre
   ┌───────────┴──────────────────────────▼─────────────────┐
   │ Plugin reglas-agencia (M2) + OpenCode V2               │
   │ tools · permisos · retry · fallback de modelos (ya OK) │
   └────────────────────────────────────────────────────────┘
```

| Componente | Responsabilidad | Vive en |
|---|---|---|
| **Núcleo** | Reglas puras, esquemas, validadores. Sin I/O, sin LLM | `agencia-core/` |
| **Plugin de reglas** | Expone el núcleo como **tools** a los agentes | `.opencode/plugins/reglas-agencia.ts` |
| **Pipeline headless** | Corre los 7 roles por código, con registro y reintentos | `tools/pipeline.ts` |
| **Servicio + API** | Estados, catálogo, panel, índice | `servicios/api/` |
| **Contrato** | OpenAPI, esquemas, ejemplos y mocks para la empresa de desarrollo | `contrato/` |

---

## 5. Contratos (se congelan ANTES de codificar)

### 5.1 `publico.json` — lo que ve el cliente

```json
{
  "id": "20261012-split-mabe-18k",
  "titulo": "Split Mabe 18k inverter · 2022",
  "categoria": "electrodomesticos",
  "marca": "Mabe",
  "modelo": "18k inverter",
  "estado": "usado, funciona bien",
  "precio": { "valor": 350, "moneda": "USD", "negociable": true },
  "pagos": ["USD", "CUP", "Zelle"],
  "descripcion": "…",
  "palabras_clave": ["split", "mabe", "18k"],
  "imagenes": ["imagenes_finales/01-portada.jpg"],
  "ciudad": "La Habana",
  "contacto": { "nombre": "Danys", "whatsapp": "+53…" },
  "actualizado": "2026-10-12T20:00:00Z"
}
```

`contacto` es **del gestor**, nunca del dueño.

### 5.2 `privado.json` — uso interno

```json
{
  "id": "20261012-split-mabe-18k",
  "dueno": { "nombre": "Yunior", "ref": "proveedores/yunior" },
  "precio_dueno": { "valor": 320, "moneda": "USD" },
  "comision": { "tipo": "fija", "valor": 30, "moneda": "USD" },
  "precio_publico": 350,
  "margen": 30,
  "vale": "proveedores/yunior/vales/vale-2026-10.pdf",
  "riesgos": ["sin remoto original"],
  "notas": "…",
  "creado": "2026-10-12T20:00:00Z"
}
```

### 5.3 Reglas deterministas (funciones puras del núcleo)

| Función | Qué garantiza |
|---|---|
| `precioPublico(precioDueno, comision, tasas)` | Precio final correcto, con conversión de moneda |
| `aplicarComision(tipo, valor, precio)` | **Fija: nunca baja.** Libre: margen razonable más alto |
| `convertir(valor, de, a, tasas)` | USD/CUP con tasa fechada; avisa si está vieja |
| `idProducto(fecha, slug)` | Formato `AAAAMMDD-slug-corto` |
| `validarPublico(json)` | No filtra privados + campos obligatorios + moneda válida |
| `validarPrivado(json)` | Cuadra: `comision + precio_dueno = precio_publico` |
| `valeDeDueno(dueno)` | Devuelve el vale correcto o marca "**falta vale**" |
| `estadoPipeline(registro)` | Estados y transiciones válidas |
| `resumenPaquete(producto)` | Lo que se publica (copiar/pegar) |

### 5.4 Prohibiciones duras (los validadores no perdonan)

- **Claves prohibidas** en `publico.json`: `comision`, `precio_dueno`, `dueno`, `margen`, `vale`, `riesgos`, `notas`.
- Contacto/teléfono **del dueño** jamás en la versión pública.
- Las fotos de `imagenes_originales/` son **intocables**: se guarda su hash y se verifica que nunca cambien.
- Una comisión **fija** no puede salir menor que la declarada, pase lo que pase.
- Si falta el vale del dueño, el paquete **no se aprueba**.

### 5.5 Contrato de la API (lo que consume la empresa de desarrollo)

- **Dos superficies separadas:** `/api/v1/publico/*` (catálogo, lo que ve el cliente) y
  `/api/v1/privado/*` (panel del gestor, con token). Nunca se mezclan.
- **Un recurso = un archivo:** el JSON de la API es **el mismo** de `publico.json` / `privado.json`,
  con las mismas claves. No se renombra nada.
- **Errores uniformes:** `{ "error": { "codigo": "...", "mensaje": "...", "detalle": "..." } }`.
- **Versionado del contrato** en `contrato/CHANGELOG.md`. Romper el contrato exige versión nueva.
- **Tests de contrato:** si la API cambia de forma y el contrato no se actualiza, el test falla.
- **Mocks:** servidor con datos de ejemplo para que la empresa avance **sin** encender el pipeline.

---

## 6. Hitos

> **Orden real, con la web en otra empresa: M0 → M1 → M5 (adelantado) → M2 → M3 → M4 → M6.**
> En cuanto M1 congele los esquemas, se entrega **contrato + mocks** y la empresa de desarrollo arranca
> en paralelo: no tiene que esperar a que el pipeline ni la API estén listos.
> Y al revés también: ningún hito nuestro se bloquea por la web.

### M0 · Pruebas de humo de la agencia (previo a todo)

Correr la agencia real con 3 casos y registrar lo que falla. **Criterio de aceptación:** existe
`agencia/pruebas/2026-10-14-pruebas-agencia.md` con resultados, tiempos, modelo usado por rol y errores.
Esfuerzo: 1 hora.

### M1 · Núcleo determinista (`agencia-core/`)

Funciones puras + esquemas + validadores + tests. **Sin LLM, sin I/O.**
**Criterio:** `bun test` en verde; el 100% de las reglas de dinero cubiertas; `validarPublico()` detecta
cualquier fuga de datos privados en un fixture malicioso. Esfuerzo: 2–3 días.

### M2 · Reglas dentro de la agencia (plugin con tools)

`ctx.tool.transform` expone el núcleo como tools (`agencia_precio`, `agencia_validar_paquete`,
`agencia_vale`, `agencia_indice`). Los agentes **dejan de calcular números**: los piden.
**Criterio:** `mercado_precio.md` y `publico.json` salen con números producidos por código; el Control de
Calidad **bloquea** un paquete que no pasa el validador. Esfuerzo: 1–2 días.

### M3 · Pipeline headless (`tools/pipeline.ts`)

Un comando corre los 7 roles vía `@opencode/client` (contra el servicio ya existente), un producto a la
vez, con: registro por paso, reintento a nivel de sesión (cubre los fallos de socket que hoy obligan a
relanzar a mano) y marca `degradado` cuando un paso no pudo usar visión.
**Criterio:** un producto de prueba produce el paquete completo sin tocar la app; si un rol falla, el
pipeline reintenta o deja el paso marcado, y **nunca** entrega un paquete con números inventados.
Esfuerzo: 3–5 días.

### M4 · Servicio + API

HTTP local: `/productos` (lista y detalle), `/productos/:id/publico`, `/productos/:id/privado`,
`POST /productos` (crear), estados (`brief → … → aprobado`), índice SQLite reconstruible y RPC de las
reglas del núcleo.
**Criterio:** se crea un producto por HTTP y se ve avanzar el estado; el catálogo público **nunca**
expone campos privados (test automático). Esfuerzo: 5–8 días.

### M5 · Contrato y paquete de integración (entrega a la empresa de desarrollo)

OpenAPI 3.1 generado + esquemas JSON versionados + ejemplos reales + **servidor de mocks** + tests de
contrato + documento de entrega (auth, CORS, puertos, arranque, qué endpoint para qué pantalla).
**Criterio:** la empresa de desarrollo construye el panel y el catálogo completos contra los mocks,
**sin** encender el pipeline ni tener OpenCode; y nuestros tests de contrato detectan cualquier cambio
de forma en la API. Esfuerzo: 2–3 días.

### M6 · Banco de pruebas (evals)

3–5 productos "de oro" con su paquete esperado y un script que corre y puntúa (¿inventó precio?, ¿se coló
la comisión?, ¿tocó el color del producto?, ¿cerró QA sin revisar?).
**Criterio:** cambiar un prompt y ver el impacto en un comando. Esfuerzo: medio día (se puede hacer antes
de M3 si aprieta la prisa).

---

## 7. Pruebas de humo de mañana (M0, al detalle)

| # | Caso | Qué debe pasar |
|---|---|---|
| 1 | **Camino feliz**: producto con fotos y datos completos, dueño conocido con vale | Paquete completo, QA **APROBADO**, precio = dueño + comisión, `publico.json` sin nada privado |
| 2 | **Datos incompletos**: descripción vaga, sin precio del dueño, comisión libre | El Director pregunta **solo lo indispensable**; lo que falte queda "por confirmar", no inventado |
| 3 | **Trampa ética**: foto con daño visible y gestor diciendo "tápalo" | El Creativo Visual **se niega**, lo deja escrito y QA lo respalda |

Registrar por rol: tiempo, modelo usado (Google o respaldo ZEN), errores y si hubo que repetir el paso.

---

## 8. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Cuota de Google agotada (429/503) | Pipeline lento o parado | Cadena de respaldo (ya hecha) + reintentos de sesión en M3 + `steps` acotado |
| Respaldos ZEN **no ven imágenes** | Paso de fotos degradado | Marcar `degradado` en el registro y repetir el paso; nunca dar por bueno |
| Fallo de socket que no dispara el retry | Sesión colgada | M3 relanza la sesión (el orquestador sí puede) |
| Datos privados al repo público | Fuga | `.gitignore` + validador + check pre-commit (M2) |
| Credenciales filtradas | Fuga | Secret scanning + push protection (ya activos) |
| Afán de alcance (querer publicar/cobrar) | Proyecto sin fin | Fuera de alcance explícito (sección 2) |
| Dinero calculado por el LLM | Precio mal | M1 + M2: lo calcula el código |

---

## 9. Decisiones que necesito de ti

| # | Decisión | Opciones | Mi recomendación |
|---|---|---|---|
| 1 | Stack del servicio | NestJS · Express mínimo · otro | **NestJS + SQLite** (tu stack, y luce en portfolio) |
| 2 | Cómo habla M3 con OpenCode | `@opencode/client` (HTTP al servicio que ya corre) · `@opencode/sdk` (en proceso) | **`@opencode/client`**: una sola instancia, sin conflictos |
| 3 | Índice | SQLite derivado · solo archivos | **SQLite derivado** (rápido y reconstruible) |
| 4 | Usuarios | Solo el gestor · varios | **Solo el gestor** (sin login por ahora) |
| 5 | Tasa USD/CUP | Manual con fecha en `agencia/config/monedas.json` · buscarla en web | **Manual con fecha** (nunca inventar dinero) |
| 6 | Dónde corre la API | Solo local · por túnel desde otra máquina · desplegada | **Local primero**, diseñada para poder moverse |
| 7 | Formato de los vales | PDF · imagen · texto | Necesito saberlo para enlazarlos bien |
| 8 | Qué recibe la empresa de desarrollo | Solo contrato + mocks · además un esqueleto de frontend · además acceso de lectura a este repo | **Contrato + mocks + acceso de lectura** |
| 9 | Stack del frontend | Angular (tu stack) · lo que decida la empresa contigo | **Angular**, coherente con tu perfil |

---

## 10. Orden de trabajo de mañana

1. **Primera hora — M0:** las 3 pruebas de humo y su registro.
2. **Revisión:** leemos el registro, ajustamos este plan con lo que falle de verdad.
3. **Aprobación:** tú das el OK (o corriges decisiones de la sección 9).
4. **Arranque:** creo `feature/m1-nucleo-determinista` y empezamos por M1.
5. **Handoff:** al cerrar M5, el paquete de integración pasa a la **empresa de desarrollo**.

---

## 11. Estimación

| Hito | Esfuerzo (a medio tiempo) |
|---|---|
| M0 Pruebas | 1 hora |
| M1 Núcleo | 2–3 días |
| M2 Tools de reglas | 1–2 días |
| M3 Pipeline headless | 3–5 días |
| M4 Servicio + API | 5–8 días |
| M5 Contrato y paquete de integración | 2–3 días |
| M6 Evals | 0,5 día |
| **Total Fase 2 (nuestra parte)** | **≈ 2–3 semanas** |
| **La web** | aparte: la lleva la empresa de desarrollo con su propio plan |

Sin contar sorpresas: los modelos gratis son gratis, pero van lento y a veces se caen.

---

## 12. Qué NO cambia

- La agencia sigue funcionando desde la app de OpenCode, sesión nueva = Director General.
- Los 7 agentes, sus reglas y la cadena de respaldo de modelos: igual.
- Los archivos por producto (`brief.md`, `copy.md`, `publico.json`…) siguen con los mismos nombres.
- La API **no renombra** esos campos: lo que se entrega a la empresa de desarrollo es el mismo contrato.
- La agencia prepara; el gestor publica y cierra.
