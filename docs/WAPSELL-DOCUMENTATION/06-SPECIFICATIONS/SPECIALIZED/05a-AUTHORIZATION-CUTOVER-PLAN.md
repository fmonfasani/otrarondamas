# Wapsell — Plan de cut-over de autorización

**Versión:** 0.1 | **Estado:** PROPUESTO — pendiente de aprobación del Owner | **Fecha:** 2026-11-11

> Requisito de `OR-B4-025`: el Owner autorizó que el motor canónico (matriz por rol) reemplace a los permisos por
> usuario **sujeto a un plan previo** que apruebe antes de activar. Spec: `05-AUTHORIZATION-SPEC.md` v0.3 (#161).
> Este plan no activa nada por sí mismo.

---

## 1. Evidencia (2026-11-11)

| Fuente | Resultado |
|---|---|
| Base `wapsell_prod` (consulta `BEGIN READ ONLY`, solo conteos) | 0 `Empresa`, 0 `Usuario`, 0 `Membership`, 0 `Permiso`, 0 `UsuarioPermiso`, 0 `RoleGrant`, 0 `CapabilityGrant`, 0 `Cliente` |
| Logs del contenedor `api` (48 h) | 0 eventos `authz.shadow.divergence` (sin tráfico autenticado) |
| Cobertura de políticas | 149 rutas no públicas con `@CanonicalPermission`; `endpoint-policy-coverage.spec.ts` |
| Tests de integración (B4) | 4 de 56 suites crean asignaciones `UsuarioPermiso`; 111 aserciones de 403 en total |

**Conclusión:** en producción ningún usuario real cambia de acceso, porque no hay ninguno. El riesgo del cut-over está en
el código y en los tests, no en los datos. Por eso conviene activarlo **ahora, antes de cargar usuarios reales**.

## 2. Qué cambia al activar

| Hoy (legacy) | Con el motor canónico |
|---|---|
| `@RequirePermission`: el usuario necesita la fila `UsuarioPermiso` | El rol necesita el permiso declarado en `@CanonicalPermission` (matriz §4) |
| `@Authorize`: `RoleTemplate` + `CapabilityGrant` (overrides por Membership) | Matriz fija; los overrides se ignoran (`AUTH-04`) |
| Endpoints sin decorador: cualquier staff autenticado | Necesitan el permiso declarado; lo no declarado se rechaza (`AUTH-10`) |
| Owner sin asignaciones: rechazado | Owner: todo el Business |

Efectos a tener en cuenta:

1. **`PROVEEDOR` y `REPARTIDOR`** (las invitaciones los siguen creando) no son roles de Membership: pierden todo
   endpoint de staff y conservan solo los `AUTHENTICATED`. Coherente con `OR-B4-006`; hoy no hay ninguno en producción.
2. **`ADMIN` y `GESTOR_DE_STOCK`** todavía no existen en `RolUsuario` (#160). Hasta entonces el motor solo ve `OWNER`
   y `ASISTENTE_LOCAL → VENDEDOR`.
3. Las tablas legacy (`UsuarioPermiso`, `Permiso`, `RoleTemplate`, `CapabilityGrant`) **no se borran**: dejan de
   decidir. Retirarlas es la etapa 5 y requiere otra decisión del Owner.

## 3. Mecanismo

- Variable `AUTHZ_ENGINE_MODE` = `shadow` | `enforce`. El código toma `shadow` por defecto.
- En `enforce`, los dos guards deciden con el motor y registran la decisión legacy como divergencia (al revés que
  hoy), así la paridad se sigue midiendo. En los endpoints que hoy solo piden autenticación, el rol se lee de la base
  (`Usuario.rol` o `Membership.role`), no del JWT.
- La activación se hace con un PR que cambia el **default del código** a `enforce`. No se toca el compose de
  `/opt/wapsell`, que no se modifica.

## 4. Pasos (cada uno es un PR con CI completo)

| # | Paso | Cambia comportamiento |
|---|---|---|
| 1 | Implementar el modo `enforce` detrás de la variable (default `shadow`), con tests unitarios de ambos modos | No |
| 2 | Agregar un job de CI que corra B4 completo en `enforce` y alinear los tests que verifican la regla vieja (asignación por usuario) con la matriz aprobada, justificando cada cambio con `OR-B4-024/025`. Los tests de aislamiento entre Businesses (B3) no se tocan | No |
| 3 | **Activación:** default `enforce`; deploy con aprobación del environment `production` | **Sí** |
| 4 | Observación: revisar los logs `authz.*` después de la activación y otra vez a las 24 h | No |

## 5. Rollback

- **Inmediato (~2 min):** volver a la imagen anterior (`wapsell-api:previous`, la deja el deploy) o revertir el PR del
  paso 3. No hay migraciones ni datos involucrados, así que el rollback es completo.
- **Criterio para revertir:** cualquier 403 inesperado para el Owner, o un error en los guards.

## 6. Qué aprueba el Owner

1. Activar ahora, con la base vacía, en lugar de esperar a cargar usuarios.
2. Que `PROVEEDOR` y `REPARTIDOR` pierdan acceso de staff (§2.1).
3. Los pasos 1–4 y el rollback de §5.
