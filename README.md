# Agencia de Ventas Virtual

**Sistema multiagente que convierte un producto crudo en una publicación lista para vender.**

La agencia recibe lo que hay: fotos regulares y una descripción vaga (típico de los
grupos de WhatsApp de dueños y proveedores) y devuelve un paquete completo: ficha
técnica honesta, precio de mercado, textos para Revolico y Facebook, fotos
mejoradas, vale de venta y un control de calidad que aprueba o devuelve.
La agencia **prepara**; el gestor **publica y cierra**.

> **🇬🇧 Summary (EN).** A 7-role multi-agent system built on **OpenCode V2** that turns raw
> product info (bad photos + vague descriptions from WhatsApp reseller groups) into
> ready-to-publish listings for Revolico and Facebook groups. One product at a time.
> Agents collaborate through a **file-based shared workspace** (no chat), with a quality
> gate that can send work back. A local **TypeScript plugin** adds a resilient model
> fallback chain (Google AI Studio → two free OpenCode ZEN models) by hooking the session
> retry event and switching models mid-session. All models are free-tier.

![Arquitectura de la agencia de ventas](docs/arquitectura.png)

*Diagrama interactivo (zoom, temas claro/oscuro, animación de trazas): `docs/arquitectura.html`.*

## El problema

Un gestor de ventas en Cuba consigue productos de dueños y proveedores por WhatsApp.
Publicarlos bien (Revolico + grupos de Facebook) exige tiempo y oficio: entender el
producto, comparar precios del mercado, escribir un anuncio que venda, mejorar las
fotos sin mentir y cuidar los datos privados del dueño (precio real y comisión).
Hacerlo a mano, producto a producto, no escala.

## Los 7 agentes

Un **Director General** (agente primario) habla con el gestor y reparte el trabajo.
Los otros seis son subagentes que él lanza y supervisa.

| Agente | Rol | Qué entrega |
|---|---|---|
| **Director General** | Orquesta el flujo completo y es el único que habla con el gestor | `brief.md` + paquete final |
| **Analista de Producto** | Mira las fotos y saca los datos reales | `ficha_tecnica.md` |
| **Analista de Mercado y Precio** | Busca comparables y define el precio público aplicando las reglas de comisión | `mercado_precio.md` |
| **Redactor de Ventas** | Escribe títulos y descripciones que venden, en tono cubano | `copy.md` |
| **Creativo Visual** | Mejora las fotos y decide portada y orden (mejorar, nunca falsear) | `visual.md` + `imagenes_finales/` |
| **Asistente Comercial** | Gestiona los vales por dueño, separa datos públicos/privados y arma los mensajes | `vale_venta.md`, `publico.json`, `privado.json`, `registro.md` |
| **Control de Calidad** | Audita el paquete y da veredicto | `qa_reporte.md` (APROBADO o CAMBIOS) |

## Cómo funciona

**Un producto a la vez.** Cada producto vive en su carpeta
(`agencia/productos/<AAAAMMDD-slug>/`) y el flujo es siempre el mismo:

```
gestor ─▶ Director ─┬─▶ Analista de Producto ────▶ ficha_tecnica.md
                    ├─▶ Analista de Mercado ────▶ mercado_precio.md
                    ├─▶ Redactor de Ventas ─────▶ copy.md
                    ├─▶ Creativo Visual ────────▶ visual.md + fotos finales
                    ├─▶ Asistente Comercial ────▶ vale + público/privado + registro
                    └─▶ Control de Calidad ─────▶ APROBADO / CAMBIOS
                                                     │
                                          CAMBIOS ───┘ vuelve a quien falló
```

**La comunicación es por archivos, no por chat.** Cada subagente lee lo que dejó el
anterior y escribe su parte en la carpeta del producto. El Director solo recibe
resúmenes cortos. Esto hace el proceso **auditable** (todo queda escrito), barato en
tokens (cada agente lee solo lo que necesita) y fácil de reanudar si algo se corta.

## Estrategia de modelos y resiliencia

Todo con **capas gratuitas**. El modelo principal es de Google AI Studio y cada
agente tiene cadena de respaldo:

| Orden | Modelo | Proveedor |
|---|---|---|
| Principal | `google/gemini-3.8-flash` | Google AI Studio (capa gratis, con visión) |
| Respaldo 1 | `opencode/big-pickle` | OpenCode ZEN (gratis) |
| Respaldo 2 | `opencode/nemotron-3-ultra-free` | OpenCode ZEN (gratis) |

OpenCode V2 admite **un solo modelo por agente**, sin respaldo nativo. Para cubrir la
cuota diaria de Google (que se agota) escribí un **plugin local en TypeScript**
(`.opencode/plugins/model-fallback.ts`, ~150 líneas comentadas) que usa la API V2 de
plugins: engancha el evento de reintento de la sesión, clasifica el error (cuota,
429/5xx, timeout, red) y **cambia el modelo de la sesión al siguiente de la cadena**
antes de reintentar. Si el modelo que falla no está en la cadena, fuerza el primero.

## Estructura del repositorio

```
AGENTS.md                        # manual del proyecto (cómo trabaja la agencia)
.opencode/
  opencode.json                  # modelo por defecto del proyecto (Google)
  agents/*.md                    # los 7 agentes: prompt + modelo + permisos
  plugins/model-fallback.ts      # cadena de respaldo de modelos
agencia/
  README.md                      # guía rápida de uso
  config/politica.md             # reglas de negocio completas
  config/modelos.md              # modelos, respaldo y límites
  plantillas/                    # plantillas de copy, mensajes y ficha de dueño
  productos/_indice.md           # índice de productos
  proveedores/_indice.md         # índice de dueños
docs/
  arquitectura.png / .html       # diagrama del sistema
.github/
  CODEOWNERS                     # dueño del repo
  pull_request_template.md       # plantilla de PR
CONTRIBUTING.md                  # flujo de ramas (Gitflow)
LICENSE                          # MIT
```

> **Nota de privacidad:** el repo es público, así que las carpetas de trabajo reales
> (`agencia/productos/<id>/` y `agencia/proveedores/<dueno>/`) están en `.gitignore`:
> contienen precios del dueño, comisiones y vales. Si quieres versionarlas, usa un repo
> privado y ajusta el `.gitignore`.

## Cómo se monta

1. Instala **OpenCode V2** (app de escritorio o CLI) y conecta un proveedor de
   **Google AI Studio** con su clave (capa gratis).
2. Abre este proyecto. Los agentes y el plugin se cargan solos desde `.opencode/`.
3. Abre una sesión con el agente **Director General** y mándale el producto:
   fotos + lo que sepas (qué es, estado, dueño y si la comisión es fija o libre).
4. El Director reparte el trabajo y devuelve el paquete listo para copiar y pegar.

## Ramas y flujo de trabajo

Gitflow, con `main` como rama estable y protegida:

| Rama | Para qué |
|---|---|
| `main` | Versión estable / publicable (protegida) |
| `develop` | Integración del trabajo en curso (protegida) |
| `feature/<tema>` | Nueva función o mejora → PR a `develop` |
| `release/<version>`, `hotfix/<tema>` | Cierre de versión y arreglos urgentes (protegidas) |

`main`, `develop`, `release/*` y `hotfix/*` no admiten push directo, ni borrado,
ni reescritura de historial: todo entra por **Pull Request**. Detalle del flujo en
[`CONTRIBUTING.md`](CONTRIBUTING.md). El repositorio tiene además **escaneo de
secretos** y **protección de push** activados.

## Reglas de negocio clave

- **Comisión inviolable:** si es fija, no se baja nunca (si se puede subir, se avisa
  al gestor); si es libre, la agencia busca el mejor margen razonable.
- **Privacidad:** el precio del dueño, la comisión y sus datos **nunca** salen en la
  versión pública. Los agentes separan `publico.json` (para la UI de clientes, con
  precio final) de `privado.json` (interno).
- **Imágenes:** mejorar, nunca falsear. Se permite recorte, luz, color y limpieza de
  fondo; se prohíbe cambiar el modelo o el color del producto u ocultar daños.
- **Un vale por dueño:** cada dueño tiene su vale; se guarda y se usa el suyo.
- **Honestidad técnica:** los respaldos gratuitos de ZEN no ven imágenes; si Google
  falla en un paso que mira fotos, ese paso se degrada y hay que repetirlo.

## Estado y próximos pasos

- ✅ **Fase 1 terminada:** los 7 agentes, las reglas, las plantillas, el flujo por
  archivos y la cadena de respaldo de modelos (probada de punta a punta).
- 🔜 **Fase 2:** sistema web propio que consuma `publico.json` y `privado.json`
  (catálogo de clientes + panel interno del gestor).
- 🔜 **Fase 3:** más canales (Instagram, TikTok) y métricas de venta.

**Límites conocidos:** no publica solo en Revolico/Facebook (no hay API pública y
automatizar Facebook arriesga bloqueo): entrega todo listo para copiar y pegar.
No cierra la venta ni cobra.

## Notas técnicas

- **Stack:** OpenCode V2 (agentes en Markdown + plugin TypeScript), datos en
  Markdown/JSON, diagramas generados con SVG/HTML.
- **Diseño de prompts:** cada agente tiene un rol cerrado, formato de salida fijo y
  reglas de honestidad explícitas; el Control de Calidad es un gate real que puede
  devolver el trabajo.
- **Detalles del proyecto en `agencia/config/modelos.md`:** incluye dos hallazgos de
  V2 que costaron encontrar (los subagentes sí heredan su `model:` pero las sesiones
  primarias no; y un `shell: deny` en un agente hace que la capa gratis de ZEN
  rechace las peticiones con 403).

## Licencia

MIT — ver [`LICENSE`](LICENSE).