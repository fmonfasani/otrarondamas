---
name: git-safety
description: Git protection rules - state verification, branch management, destructive operations
type: rule
severity: critical
---

# Git Safety Rules

## Verificación de Estado Obligatoria

Antes de CUALQUIER modificación:

```bash
git status --short --branch
git rev-parse HEAD
git rev-parse --abbrev-ref HEAD
git log --oneline -3
```

Verificar:
- ✅ Estás en la rama correcta
- ✅ No hay conflictos no resueltos
- ✅ Los cambios preexistentes están registrados
- ✅ El SHA es el esperado

## Reglas de Rama

| Operación | main | feature/* | hotfix/* |
|-----------|------|-----------|----------|
| Modificar código | ❌ Excepto emergencia | ✅ Sí | ✅ Sí |
| Crear commit | ❌ No sin auth | ✅ Sí con justificación | ✅ Sí |
| Hacer push | ❌ No sin CI verde | ✅ Sí después de validar | ✅ Sí después de validar |
| Mergear | ❌ No en HEAD | ✅ Solo en origin | ✅ Solo en origin |

## Operaciones Destructivas - BLOQUEADAS

❌ **NUNCA ejecutes sin confirmación explícita**:

```bash
# NUNCA SIN AUTORIZACIÓN
git reset --hard          # Descarta cambios
git clean -fd             # Borra archivos
git checkout .            # Revierte working tree
git restore .             # Revierte cambios
git push --force          # Sobrescribe remote
git push --force-with-lease  # (usar solo si absolutamente necesario)
git branch -D             # Borra rama
git rebase -i             # Reescribe historia
```

Si necesitas una de estas operaciones:
1. **Documenta** por qué es necesaria
2. **Obtén autorización explícita** del dueño del código
3. **Verifica** que no hay cambios críticos
4. **Ejecuta** con máxima cautela
5. **Reporta** lo que sucedió

## Preservación de Cambios Preexistentes

**REGLA**: Todo cambio en el repositorio que no sea tuyo debe preservarse.

Antes de trabajar:
```bash
git diff HEAD > /tmp/preexisting.patch
git stash
```

Después de terminar:
```bash
# Si hay cambios preexistentes que salvaste:
git stash pop
# Verifica que se aplicaron correctamente
git diff /tmp/preexisting.patch
```

**Si hay conflictos**:
- ❌ No los resuelvas arbitrariamente
- ✅ Contacta al dueño del código
- ✅ Preserva AMBOS cambios si es posible

## Commit Safety

### Antes de Commitear

```bash
git status           # Ver qué se va a commitear
git diff --cached    # Revisar cambios
git diff HEAD        # Ver unstaged
```

### Contenido Prohibido

❌ **NUNCA commitees**:
- Secretos (API keys, passwords, tokens)
- Archivos de entorno (.env, .env.local)
- Credenciales de BD
- Información sensible de usuario

✅ **Sí commitees**:
- Código funcional
- Tests
- Documentación
- Configuración no-sensitiva

### Mensaje de Commit

Formato:
```
<type>(<scope>): <subject>

<body>

<footer>

Co-Authored-By: Claude <version> <noreply@anthropic.com>
```

Tipos: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`

## Push Safety

❌ **NO hagas push** si:
- Tests fallan
- Lint/build tiene errores
- Cambios preexistentes están en riesgo
- No tienes autorización

✅ **Sí hace push** cuando:
- Validaciones locales pasan
- Cambios están justificados
- Rama está actualizada con upstream
- Tienes autorización

## Recuperación de Errores

### Si accidentally commiteas cambios sensibles:

```bash
# ANTES DE PUSH
git reset HEAD~1           # Deshacer commit
git add -p                 # Interactivo: qué commitear
git commit                 # Nuevo commit sin sensibles

# NUNCA uses:
git push --force           # Esto reescribe historia remota
```

### Si hiciste push de algo prohibido:

1. **Contacta inmediatamente** al admin
2. **NO intentes arreglarlo** con `force push`
3. **Documenta qué se expuso** y por cuánto tiempo
4. **Rota credenciales** si es necesario

## Autorización Requerida

Estas operaciones requieren confirmación explícita:

- ✋ **Commitear cambios**: En feature branches con justificación
- ✋ **Hacer push**: Después de validaciones
- ✋ **Mergear PRs**: Revisión de código + 1 aprobación
- ✋ **Cambiar main**: Solo hotfixes documentadas
- ✋ **Operaciones destructivas**: Propósito, contexto, backup plan

## Validación Automática

Antes de permitir push, verificar:

```
✅ Branch es feature/* o hotfix/*
✅ No hay conflictos
✅ Tests pasan
✅ Lint pasa
✅ Build compila
✅ Cambios preexistentes preservados
✅ Commit mensaje válido
✅ Ningún secreto detectado
```

Si algo falla → Bloquea push hasta que se corrija.
