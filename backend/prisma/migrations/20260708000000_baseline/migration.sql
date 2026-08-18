-- Baseline del esquema que ya existía antes de adoptar Prisma Migrate.
-- Esta migración se marca como aplicada y no se ejecuta sobre la base existente.

CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "empresa" TEXT,
    "rfc" TEXT,
    "correo" TEXT NOT NULL,
    "telefono" TEXT,
    "direccion" TEXT,
    "notas" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Cotizacion" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vencimiento" TIMESTAMP(3),
    "subtotal" DECIMAL(12,2) NOT NULL,
    "iva" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "notas" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Cotizacion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Concepto" (
    "id" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "cantidad" DECIMAL(10,2) NOT NULL,
    "precioUnitario" DECIMAL(12,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    CONSTRAINT "Concepto_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Pago" (
    "id" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "metodo" TEXT NOT NULL,
    "referencia" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Pago_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HistorialCot" (
    "id" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "estadoAnterior" TEXT,
    "estadoNuevo" TEXT NOT NULL,
    "nota" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HistorialCot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Cliente_rfc_key" ON "Cliente"("rfc");
CREATE UNIQUE INDEX "Cotizacion_numero_key" ON "Cotizacion"("numero");

ALTER TABLE "Cotizacion" ADD CONSTRAINT "Cotizacion_clienteId_fkey"
FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Concepto" ADD CONSTRAINT "Concepto_cotizacionId_fkey"
FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Pago" ADD CONSTRAINT "Pago_cotizacionId_fkey"
FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "HistorialCot" ADD CONSTRAINT "HistorialCot_cotizacionId_fkey"
FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
