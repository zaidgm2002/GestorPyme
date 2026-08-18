CREATE TABLE "ConversacionTavus" (
    "id" TEXT NOT NULL,
    "tavusConversationId" TEXT,
    "palId" TEXT NOT NULL,
    "faceId" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'INICIADA',
    "iniciadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizadaEn" TIMESTAMP(3),
    "duracionSegundos" INTEGER,
    "motivoCierre" TEXT,
    "error" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversacionTavus_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConversacionTavus_tavusConversationId_key"
ON "ConversacionTavus"("tavusConversationId");
