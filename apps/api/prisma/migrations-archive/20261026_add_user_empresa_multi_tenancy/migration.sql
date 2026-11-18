-- CreateTable for UserEmpresa
CREATE TABLE "UserEmpresa" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'owner',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserEmpresa_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint
CREATE UNIQUE INDEX "UserEmpresa_usuarioId_empresaId_key" ON "UserEmpresa"("usuarioId", "empresaId");

-- Create indexes for performance
CREATE INDEX "UserEmpresa_usuarioId_idx" ON "UserEmpresa"("usuarioId");
CREATE INDEX "UserEmpresa_empresaId_idx" ON "UserEmpresa"("empresaId");

-- Add foreign keys
ALTER TABLE "UserEmpresa" ADD CONSTRAINT "UserEmpresa_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserEmpresa" ADD CONSTRAINT "UserEmpresa_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
