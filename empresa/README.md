# Empresa · guía rápida de uso

Mesa de trabajo de la empresa virtual de software. Todo el trabajo vive en
`empresa/proyectos/<slug>/vN/` (gestión) y el código en `proyectos/<slug>/vN/`.

## Para arrancar

1. Abre una sesión con el agente **Director Técnico** (es el primario).
2. Mándale tu idea: qué quieres, para quién, restricciones que tengas.
3. El Director reparte entre los 8 especialistas y te devuelve el proyecto
   corriendo en local + `entrega.md`.
4. Pruébalo. Solo con tu OK se hace Docker/despliegue.

## Estructura

- `config/politica.md` — reglas inviolables R1-R13.
- `config/modelos.md` — modelos y cadena de respaldo.
- `portafolio.md` + `proyectos/_indice.md` — todos los proyectos y su estado.
- `proyectos/<slug>/brief.md` — idea original. `cambios.md` por versión.
- `proyectos/<slug>/vN/` — investigacion, requerimientos, arquitectura,
  diseno_uxui, tareas, test_reporte, qa_reporte, entrega, registro.
- `plantillas/` — modelos de cada documento.
- `proyectos/<slug>/vN/` (raíz) — código: `src/`, `tests/`, `README.md`.

## Reglas de oro

- Solo el Director decide y reparte (R12). Sin APROBADO de QA no hay entrega (R4).
- `src/` solo el dev, `tests/` solo testing (R2). Cobertura ≥70% (R3).
