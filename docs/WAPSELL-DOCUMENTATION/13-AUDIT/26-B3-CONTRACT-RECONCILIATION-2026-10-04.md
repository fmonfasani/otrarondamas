# B3 — CONTRACT RECONCILIATION — 2026-10-04

**Status:** NO CANÓNICO — READY WITH RECONCILIATION — NO OPEN OWNER DECISION  
**Scope:** B3 — Tenant Isolation (reconciliación de los candidatos contractuales)  
**Implementation:** NOT AUTHORIZED  
**Code / schema / migrations / tests / runtime:** NOT MODIFIED, NOT EXECUTED

## 0. Alcance y evidencia

Objeto reconciliado: los candidatos `B3-CON-001..024` de `07-DESIGN/CONTRACTS/DOMAIN/09-R8-ARCH-002-TENANT-ISOLATION-CONTRACT-v0.1.md` (DRAFT, no aprobado).

Fuentes leídas:
- el contrato 09 completo;
- `13-AUDIT/25-B3-TENANT-ISOLATION-INVARIANTS-INDEPENDENT-AUDIT-2026-10-04.md` completo;
- R8-ARCH-002 Owner Decision completa;
- `INV-TEN-001`, `INV-CONTEXT-001`, `INV-MEM-001/002` (B1);
- el addendum `INV-B2-*` de `00-INVARIANTS-v0.1.md`;
- ARCH-003 §12;
- C-COEX-004;
- `TE-ID-005..011`.

No leídos: el AS-IS audit (`23-BLOCK-3-...`) y la derivación paralela de 41 invariants, que **no se canoniza**.

Las referencias `[C]` provienen del contrato y del audit; no fueron re-verificadas contra el código en este documento. Todo lo aquí consignado es **DOCUMENTADO**. No existe evidencia `[T]` ni `[E]`; no se ejecutó nada.

## 1. Resultado

**8 obligaciones B3 activas + 1 OPEN TECHNICAL DETAIL.** Coincide en cifra con el audit independiente, pero fue derivado por separado y la composición difiere: 7 salen del contrato y 1 es un gap que el contrato no tenía.

| Etapa | Cantidad |
|---|---|
| Candidatas de entrada: 24 IDs `B3-CON` + 1 obligación desplazada por una colisión de numeración | **25 distintas** |
| Referencias a B1/B2/ARCH-003 §12/C-COEX-004 | −12 |
| Fusionadas en otra obligación (012→017/018, 021→020) | −2 |
| Disposición de mecanismo, no obligación (004) | −1 |
| Cláusula de alcance (022) | −1 |
| Regla de proceso (024) | −1 |
| **Obligaciones B3 reales** | **7** |
| OPEN TECHNICAL DETAIL (019) | +1 |
| Gap nuevo: fail-closed por operación no soportada | +1 |
| **Resultado** | **8 activas + 1 diferida** |

Las 8 activas son 6 STABLE y 2 CONDITIONAL. La cifra es sensible a dos decisiones: si se mantiene el gap de fail-closed, y si el invariant de independencia de la vía se disuelve por implementation leak. En ese caso la cifra firme baja a 6.

Los "20" son los `INV-B3-*` del §21 del contrato (19 derivables + 1 diferido), no los `B3-CON`. De esos 20, 12 se retiran y 7 sobreviven, más el gap nuevo. El audit dice "6 sobreviven" en §1.2 y propone 8 en §1.5: su conteo interno no cuadra; el resultado no cambia.

## 2. Auditoría del contrato

1. **Colisión de IDs (contradicción real).** `B3-CON-014/015` se definen dos veces.
   - §12 (`:380-381`): 014 = "el client ID no sustituye el contexto"; 015 = "switching resuelto por Membership" (duplica a 005).
   - §15 (`:706-732`): 014 = "ownership derivado"; 015 = "no presunción de globalidad".
   - §15.1 cuenta solo la segunda acepción. §16, §17, §18 y §21 mezclan ambas (p. ej. §21 mapea 014/015 a `INV-B3-CTX-003` con el sentido de §12 y a `OWN-001/002` con el de §15).
2. **Tabla de estados desactualizada.** §1 dice 4/11/3/5/1 (EXISTING/EXTEND/ADAPT/NEW/OPEN). Los estados por obligación, que §15.1 resume, dan 4/9/1/9/1.
3. **Afirmación incorrecta en §19.** La fila de tests dice que ningún test existente cubre nested y que los TC-B3 "no son duplicados". `TE-ID-008..011` (B1 baseline, SPECIFIED) cubren read, update/delete, unique y nested.
4. **Fail-closed por operación sin obligación.** Figura en §20 como PRESERVE, pero ningún `B3-CON` lo enuncia.
5. No hay contradicción con Owner Decisions.

## 3. Matriz candidato → fuente normativa → estado

| Candidato | Fuente normativa existente | Estado reconciliado |
|---|---|---|
| 001 contexto antes de operar | `INV-CONTEXT-001` | REFERENCE |
| 002 contexto ↔ Membership ACTIVE | `INV-CONTEXT-001`, `INV-MEM-001/002`, `INV-B2-AUTH-001` | REFERENCE |
| 003 ausente vs inválido, ambos fail-closed | `INV-CONTEXT-001`, `INV-B2-AUTH-001` | REFERENCE (la distinción es de test) |
| 004 la persistencia consume el contexto | ARCH-003 §12 y CTX-006; mecanismo OPEN §13.8/13.11 | OPEN TECHNICAL (disposición) |
| 005 y 015-switching | B2 CTX-004 y MEM-003; ARCH-003 §9 | REFERENCE (duplicados entre sí) |
| 014-client ID (desplazada) | `INV-CONTEXT-001` 3ª frase; TE-ID-006 | REFERENCE |
| 006 create | C-COEX-004; ARCH-003 §12 | REFERENCE; residuo "independiente de la allow-list" → ISO-008 |
| 007 read | `INV-TEN-001`; TE-ID-008 | REFERENCE; parte derivada → ISO-003 |
| 008 update | `INV-TEN-001`; TE-ID-009 | REFERENCE; cláusula "no depende del orden" → ISO-008 |
| 009 delete | `INV-TEN-001`; TE-ID-009 | REFERENCE |
| 010 unique lookup | `INV-TEN-001`; TE-ID-010 | REFERENCE |
| 011 nested create | C-COEX-004; TE-ID-011 | REFERENCE; el defecto concreto vive en 017/018 |
| 013 lectura de relaciones | `INV-TEN-001` ("exposed"); dependiente de 018 | REFERENCE dependiente |
| 012 vinculaciones prospectivas | ninguna | MERGE en 017/018 como cláusula CONDITIONAL; 0 usos hoy |
| 021 igual obligación en tx, SQL crudo | ninguna | MERGE en 020 |
| 022 acceso pre-contexto | `INV-B2-AUTH-001` 2ª frase | CLÁUSULA DE ALCANCE |
| 024 superficie enumerable | precedente `LEG-005` | REGLA DE PROCESO |
| **014-derivado** | ninguna | **B3 REAL** (STABLE) |
| **015-globalidad** | ninguna | **B3 REAL** (CONDITIONAL) |
| **016 identificador de negocio no global** | ninguna | **B3 REAL** (STABLE) |
| **017 FK de entrada validada** | ninguna (R5 `INV-PUR-003` es ancestro débil) | **B3 REAL** (STABLE) |
| **018 la integridad referencial no basta** | ninguna | **B3 REAL** (STABLE) |
| **020 transacción mono-contexto (+021)** | ARCH-003 §12 solo en general; B4 §142 "sin invariant propio" | **B3 REAL** (STABLE; `[ND]` por ejecución) |
| **023 independencia de la vía** | `INV-TEN-001` §7 solo en parte | **B3 REAL** (CONDITIONAL) |
| 019 `Legajo` / `DocumentoLegajo` AMBIGUOUS | ninguna | OPEN TECHNICAL DETAIL |

## 4. Duplicados eliminados

- `INV-B3-CTX-001..004` completo: triple duplicado de `INV-CONTEXT-001`, B2 y ARCH-003.
- `INV-B3-DATA-002/003`, `UNIQ-001`, `NEST-001`: duplicados de `INV-TEN-001` + TE-ID-008..011.
- `BYP-001` pasa a cláusula de alcance. `TX-002` y `NEST-002` se fusionan.
- 015-switching, que repite a 005.
- Propiedad 12 (verificación negativa): gate de verificación, no invariant (precedente `LEG-005`).

## 5. Gaps reales

1. **Fail-closed por operación no soportada.** El texto literal de R8-ARCH-002 §3.11 habla del contexto ("Missing or invalid Business context must fail closed"). La versión por operación (`empresa-scope.extension.ts:164-166`) es una **derivación** de §3.11 y del §5 (PRESERVE): es DERIVED, no literal.
   - Recomendación: mantenerla como obligación B3, porque no crea política nueva y solo preserva una propiedad que el Owner ya aprobó conservar.
   - Alternativa: PRESERVE + test, sin invariant.
   - Hoy ningún TC-B3 la prueba.
2. **Create-ownership.** Cubierto a nivel contrato por C-COEX-004; ningún invariant lo enuncia. El audit lo absorbe en ISO-001 + TE-ID-006 y fija condición de reapertura: si ningún TE cubre el create sobre `PagoProveedor` y `DevolucionProveedor`, reabrir. Se decide en el Contexto 2.
3. `AplicacionPago` tiene dos rutas de ownership: ISO-003 depende de que ISO-002 garantice que ambas coincidan.

## 6. Reconciliaciones documentales necesarias

Ninguna requiere Owner. No se renumeran documentos históricos; se resuelven con un addendum.

- **R1.** Resolver la colisión 014/015 mediante un mapeo explícito en el contrato reconciliado.
- **R2.** Corregir la tabla de §1 del contrato.
- **R3.** Corregir la fila de tests de §19 enlazando `TE-ID-005/006/008..011`.
- **R4.** **Colisión de TE-IDs.** `TE-ID-005/006` significan "Customer sin User" y "email no asocia" en `00-TESTS-EVALS-v0.2.md:54-55`, pero "contexto inválido" y "client ID no sobrescribe" en `05-BLOCK-1-TESTS-EVALS-BASELINE-v0.1.md:70-71`. El audit las cita sin notarlo. Debe resolverse antes del mapeo de tests.
- **R5.** Arrastre de §24.1 del contrato: `empresaId` como clasificador transitorio, claim JWT con doble función, docstring desactualizado (G-B3-12).
- **R6.** **Premisa de nomenclatura del audit, parcialmente obsoleta.** El audit propone `ISO-` por el set B2 de prefijos cortos; el canónico en `00-INVARIANTS-v0.1.md:730-749` usa `INV-B2-<FAM>-nnn`, y los IDs cortos solo viven en el archivo 24 (no canónico). La nomenclatura se decide en el Contexto 2.
- **R7.** Las referencias a B2 deben apuntar primero a lo canónico (`INV-B2-AUTH-001`, `INV-CONTEXT-001`, `INV-MEM-001/002`). `CTX-001..004`, `MEM-003` y `AUT-004` son del set de trabajo del archivo 24.

## 7. Lista final de obligaciones B3 (etiquetas de trabajo, no canónicas)

| Etiqueta | Obligación | Origen | Clase |
|---|---|---|---|
| ISO-001 | FK de entrada validada contra el contexto | 017 | STABLE |
| ISO-002 | Ninguna entidad vinculada a otro Business; la integridad referencial no basta | 018 (+012, 013) | STABLE |
| ISO-003 | Ownership derivado determinístico y único | 014-derivado | STABLE (condicionada a ISO-002) |
| ISO-004 | Sin presunción de globalidad | 015-globalidad | CONDITIONAL |
| ISO-005 | Identificador de negocio no global | 016 | STABLE (incumplido hoy) |
| ISO-006 | Transacción mono-contexto, incluido SQL crudo | 020 (+021) | STABLE; `[ND]` por ejecución |
| ISO-007 | Fail-closed por operación no soportada | gap nuevo | STABLE si se mantiene |
| ISO-008 | Independencia de la vía y de la disciplina del call site | 023 (+006/008) | CONDITIONAL |
| Diferido | ISO-AMBIG: ownership de `Legajo` / `DocumentoLegajo` | 019 | OPEN TECHNICAL |

Elementos de B3 que no son invariants: 022 (cláusula de alcance), 024 (regla de proceso), 004 (disposición de mecanismo), propiedad 12 (gate de verificación).

## 8. Mapeo a invariants

- Propiedades de R8-ARCH-002 1–4 y 11: B1/B2. Propiedades 5–8: B1/B2 vía `INV-TEN-001` y C-COEX-004. Propiedad 9: ISO-001/002/003. Propiedad 10: ISO-006. Propiedad 11 por operación: ISO-007. Propiedad 12: gate.
- Todo ISO desciende de `INV-TEN-001`; ISO-007 hereda además de `INV-CONTEXT-001`.
- Pre-contexto: `INV-B2-AUTH-001` ya dice que los caminos pre-contexto se gobiernan aparte; B3 solo lo referencia.

## 9. Implicaciones de test

- **TC-B3 que duplicarían TE existentes:** TC-01→TE-ID-008; TC-02/03→TE-ID-009; TC-04→TE-ID-010; TC-06→TE-ID-011; TC-13/16→TE-ID-005/006 (sujeto a R4).
- **Tests propios de B3:** TC-09 y TC-10 (FK); TC-12 (cierra ND-01); TC-11; TC-19, TC-20, TC-21; TC-23 (guardarraíl positivo). Falta un test para ISO-007.
- **No cuentan como cobertura:** TC-16 pasa trivialmente (no existe superficie de tenant en el cliente); TC-14/15/17/18 no aplican hoy (no hay Membership ni switching); TC-07/08 cubren operaciones inexistentes.
- **Caracterización vs cumplimiento:** los "falla esperado" (TC-09, 10, 19, 20, 21) caracterizan el AS-IS; no son cumplimiento TO-BE. Separación del Contexto 3.

## 10. Dependencias

- **B1:** esquema de Membership (ARCH-003 §13.12), transporte del contexto (§13.8), enforcement (§13.11). Hoy no existe Membership: las propiedades 2 y 3 no se cumplen en el AS-IS.
- **B2:** `INV-B2-AUTH-001` y el set de trabajo del archivo 24 (ND-04: archivo canónico pendiente).
- **ID-003 §5:** ningún mapping físico autorizado; afecta a `Legajo` y a la unicidad de `idempotencyKey`.
- **Customer:** C-CUST-001, porque `Legajo` puede colgar de `Usuario` o de `Cliente`.
- **B4:** depende de B3.
- **Ejecución:** ND-01 (`$extends` dentro de la transacción interactiva) solo se cierra ejecutando TC-12.

## 11. Contract Gate

**READY WITH RECONCILIATION. B3 no se cierra con este documento.**

- **Owner Decisions pendientes: 0.**
- **Riesgo de escalamiento:** resolver `Legajo` implica decidir si el modelo cuelga de User o de Customer, lo que toca semántica de dominio. Hoy se documenta como detalle técnico; conviene vigilar que no pase a ser decisión del Owner.
- **Contradicciones reales (documentales, sin Owner):** colisión 014/015; tabla de §1 desactualizada; fila de tests de §19; colisión TE-ID-005/006.
- **No es BLOCKED ni FAIL.**
- **Evidencia:** todo es DOCUMENTADO. No hay `[T]` ni `[E]`; el repositorio no tiene tests de aislamiento y nada se ejecutó. Ninguna obligación puede declararse verificada.

## 12. Siguiente paso

Cerrar R1–R4 antes de derivar los invariants canónicos (Contexto 2), o registrarlas como entradas del Contexto 2. Los Contextos 2 y 3 no se ejecutan en este documento.
