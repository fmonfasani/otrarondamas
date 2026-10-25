# 🚀 Dev Setup — Otra Ronda Más

Levanta API + Frontend en local para desarrollo.

## Requisitos previos

- **Node.js** >= 18.x
- **PostgreSQL** (local o Docker)
- **.env** configurado en `apps/api/`

## Instalación rápida

```bash
# 1. Instalar dependencias (desde raíz)
npm install

# 2. Preparar base de datos
cd apps/api
npx prisma migrate dev
npx prisma db seed  # (opcional, si existe seed)
```

## Levantar en modo dev

### Terminal 1: API (NestJS)

```bash
cd apps/api
npm run start:dev
# Puerto: 3001 (http://localhost:3001)
```

### Terminal 2: Frontend (Next.js)

```bash
cd apps/pos-admin
npm run dev
# Puerto: 3000 (http://localhost:3000)
```

### Opcional: Tienda Online (Next.js)

```bash
cd apps/tienda-online
npm run dev
# Puerto: 3002 (http://localhost:3002)
```

---

## Variables de entorno (.env)

**`apps/api/.env`** (ejemplo):
```
DATABASE_URL="postgresql://user:password@localhost:5432/otrarondamas"
JWT_SECRET="dev-secret-key"
NODE_ENV="development"
```

**`apps/pos-admin/.env.local`** (ejemplo):
```
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

---

## Verificar estado

- **API:** `curl http://localhost:3001/health`
- **Frontend:** `http://localhost:3000`
- **DB:** `npx prisma studio` (UI Prisma)

---

## Troubleshooting

| Problema | Solución |
|----------|----------|
| **"Cannot find module"** | `npm install` desde raíz |
| **DB connection refused** | Verificar PostgreSQL activo + DATABASE_URL en .env |
| **Puerto 3000/3001 en uso** | Cambiar en `package.json` o kill el proceso |
| **Prisma migration error** | `npx prisma migrate resolve --rolled-back <migration_id>` |

---

**Happy coding!** 🎉
