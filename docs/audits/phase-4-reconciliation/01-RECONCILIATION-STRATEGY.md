# 01 — Estrategia de reconciliación

## 1. Alcance

Reconciliar diferencias de código, configuración y documentación entre las copias locales, GitHub y Hetzner sin confundir el estado desplegado con el estado fuente. La reconciliación se hará por repositorio y por conjunto de cambios, no mediante sincronización ciega.

Fuera de alcance: rediseño de arquitectura, consolidación física de servicios, cambio de dominios, rotación masiva de secretos y cambios de esquema no requeridos por una integración aprobada.

## 2. Baseline obligatorio (R0)

Para cada repositorio, registrar:

- URL remota, ruta local/remota, branch, HEAD y tracking branch.
- SHA de LOCAL, GitHub y checkout desplegado.
- Ancestro común, commits ahead/behind y tags/releases.
- `git status --short --branch`, diff tracked y lista de untracked.
- Worktrees (`git worktree list --porcelain`), stashes y submódulos.
- PR abiertos, checks y commits ya integrados.
- Contenedores que consumen el repositorio, imagen/digest, compose project y rutas montadas.

No usar el inventario anterior como sustituto de esta captura actual.

## 3. Preservación (R1)

Por cada checkout:

1. Capturar salida de diagnóstico con timestamp y SHA.
2. Crear bundle Git que incluya refs locales.
3. Exportar patches tracked y archivar untracked relevantes, preservando rutas.
4. Capturar worktrees y stashes; no eliminarlos.
5. Respaldar archivos de configuración sin incluir secretos en el repositorio.
6. Verificar integridad de cada backup mediante hash y prueba de lectura/restauración en ubicación aislada.

Para producción, coordinar backup consistente de PostgreSQL, volúmenes y configuración. Un backup solo se considera válido después de verificar restaurabilidad.

## 4. Clasificación de cambios (R2)

Cada cambio recibe un ID y una categoría:

- Código funcional.
- Dependencias/manifiestos/lockfiles.
- Infraestructura (Compose, Dockerfile, Nginx).
- Migraciones/schema/datos.
- Documentación/especificaciones.
- Generados/ruido (CRLF, build output, caches).

Estados permitidos: `UNIQUE-LOCAL`, `UNIQUE-GITHUB`, `UNIQUE-HETZNER`, `DUPLICATE`, `CONFLICT`, `GENERATED`, `UNKNOWN`.

Ningún cambio `UNKNOWN` o `CONFLICT` se descarta o integra automáticamente.

## 5. Integración (R3-R4)

- Crear una rama de integración por cambio lógico desde el target actualizado.
- Portar cambios mediante cherry-pick o aplicación selectiva de patch; nunca copiar directorios completos sin diff.
- Resolver conflictos con evidencia de comportamiento y contratos.
- Mantener commits pequeños y trazables.
- Abrir PR; ejecutar checks requeridos y revisión independiente.
- No integrar dependencias o lockfiles sin confirmar versión de Node, package manager, workspace y reproducibilidad.

## 6. Criterios de decisión D1-D4

D1. GitHub será la autoridad de código únicamente después de que todo cambio único válido haya sido preservado e integrado. Hetzner conserva autoridad operacional sobre qué versión está corriendo hasta que el despliegue sea reemplazado y verificado.

D2. El README inspeccionado en la rama de trabajo distingue Wapsell como plataforma, Otra Ronda Más como negocio/código operativo y SDK como componente separado. Mantener esta separación conceptual; verificar repositorios y despliegues reales antes de moverlos.

D3. Mantener la topología actual durante la reconciliación. Consolidar/archivar requiere inventario de dependencias, consumidores, volúmenes, DNS, certificados, backups y plan de reversión.

D4. No renombrar `/opt`, contenedores, redes, volúmenes o dominios durante esta fase. Primero establecer mapping y dependencias.

## 7. Riesgos y controles

| Riesgo | Control |
|---|---|
| Pérdida de trabajo único | Bundle + patch + hash antes de integrar |
| Secretos filtrados | Exclusión explícita y escaneo antes del commit |
| Lockfile no reproducible | Instalación limpia en entorno aislado y diff de lock |
| Cambio de infraestructura rompe servicio | Validación de compose y despliegue en staging |
| Migración incompatible | Backup restaurable y estrategia expand/contract |
| Confundir documentación con implementación | Trazabilidad SPEC → código → test → evidencia |
| Auditoría histórica desactualizada | Baseline fresco antes de cada decisión |

## 8. Condiciones de bloqueo

Detener la reconciliación si falta un backup verificable, hay cambios no clasificados, la identidad del checkout desplegado es incierta, los cambios afectan datos/esquema sin plan de migración, o no existe un rollback viable.
