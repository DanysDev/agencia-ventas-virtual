# Política de la empresa de software (reglas inviolables)

## R1. Stack decidido, no improvisado

Ningún código se escribe sin `investigacion.md` aprobada por el Director. Cambio
de stack/librería base solo con aval del Director; queda en `registro.md`.

## R2. Separación total Dev vs Testing

`src/` solo lo toca el Desarrollador. `tests/` solo lo toca el Ingeniero de
Testing. Prohibido: el dev relaja tests para que pasen; el tester parcha `src/`
para que pasen. Comunicación solo vía archivos + Director.

## R3. Cobertura mínima 70%

Medida sobre lógica crítica. El Testing define el % final por versión (≥70%) en
`test_reporte.md`. Sin suite verde, QA ni entra.

## R4. QA bloquea entrega

Sin `qa_reporte.md = APROBADO` no hay `entrega.md` ni despliegue. Sin excepciones.
QA valida funcional + UX/UI.

## R5. Despliegue en dos fases con OK explícito

Fase 1: local + instrucciones para probar. Fase 2 (Docker/despliegue) solo con OK
escrito del usuario. Queda en `registro.md`.

## R6. Secretos fuera del repo

Prohibido subir `.env`, claves o tokens. Solo `.env.example` con valores falsos.
DevOps lo verifica.

## R7. Versiones aisladas

`vN` no rompe `vN-1`. Cada versión tiene su `src/`, `tests/` y sus documentos.
Reutilizar código entre versiones solo copiando, nunca con imports cruzados.

## R8. Trazabilidad por archivos

Toda decisión vive en `empresa/proyectos/<slug>/vN/`. Prohibido acordar por chat
sin volcarlo a `registro.md`. Reportes al Director ≤12 líneas.

## R9. Documentación actualizada

Sin Context7 no hay propuesta de stack/librería. `resolve-library-id` +
`query-docs` obligatorios, más `websearch` para estado 2026.

## R10. Multi-proyecto ordenado

Un proyecto puede pausarse, nunca mezclarse. El Director mantiene
`proyectos/_indice.md` y `portafolio.md` al día. Prohibido trabajar una versión
sin brief + requerimientos previos.

## R11. Código legible en inglés

Comentarios en inglés. Identificadores en inglés, descriptivos y coherentes
(`greetingMessage`, no `b`). Prohibido single-letter salvo índices de bucle de
alcance mínimo (`i`, `j`). Sin abreviaturas crípticas. Aplica a variables,
funciones, clases y archivos.

## R12. Autoridad única

Solo el Director decide, prioriza y reparte. Los especialistas no se asignan
tareas entre ellos ni cambian alcance. Bloqueos o choques → en archivo +
`registro.md`, escala al Director.

## R13. Regresión obligatoria

Cada bugfix/feature agrega su test de regresión y re-corre la suite completa.
Si lo viejo se rompe, vuelve al dev. QA lo verifica antes de APROBADO.
