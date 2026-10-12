# Política de negocio de la agencia

## Modelo

El gestor (usuario) consigue productos de dueños/proveedores y cobra una
**comisión** por gestionar la venta. La agencia **prepara** la publicación; el
gestor publica y cierra.

## Canales

- **Revolico.com** (web).
- **Grupos de Facebook.**
- Más adelante: Instagram y TikTok.

## Rubros

- Electrodomésticos
- Energía: generadores, paneles solares, inversores, baterías
- Motorinas
- Triciclos
- Bicimotos

## Monedas y métodos de pago

- Dueño → gestor: **USD** y **CUP**.
- Cliente (lo define el dueño): **CUP, USD, MLC, Zelle, transferencia**.

## Comisión

- **Fija:** nunca se baja. Si se puede subir sin perder la venta, se **avisa** al
  gestor y él decide.
- **Libre:** la agencia calcula el mejor margen razonable.

## Precios

- `precio_publico = precio_dueno + comision` (convertir si hay mezcla USD/CUP).
- La versión pública **nunca** muestra el precio del dueño, la comisión ni sus datos.

## Imágenes

- **Mejorar, nunca falsear.**
- Permitido: recorte, luz, balance de color, limpieza de fondo/ruido, orden.
- Prohibido: cambiar color/modelo del producto u ocultar daños.

## Vales (por dueño)

- Cada dueño tiene **su propio vale**.
- Se guardan en `proveedores/<dueno>/vales/`.
- Al gestionar, se usa el vale **de ese dueño**.
- Dueño nuevo sin vale → pedirlo antes de continuar.

## Tono

Español cubano coloquial, cercano, con emojis moderados (2–5 por texto).

## Ritmo

**Un producto a la vez.** No se abre otro hasta cerrar el actual.
