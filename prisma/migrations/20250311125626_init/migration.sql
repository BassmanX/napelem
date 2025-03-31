-- CreateEnum
CREATE TYPE "Role" AS ENUM ('szakember', 'raktarvezeto', 'raktaros');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('new', 'draft', 'wait', 'scheduled', 'inprogress', 'completed', 'failed');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" SERIAL NOT NULL,
    "customerName" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "estimatedTime" INTEGER,
    "workFee" DECIMAL(65,30),
    "status" "Status" NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Component" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "maxQuantityPerRack" INTEGER NOT NULL,

    CONSTRAINT "Component_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rack" (
    "id" SERIAL NOT NULL,
    "row" INTEGER NOT NULL,
    "column" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,
    "maxCapacity" INTEGER NOT NULL,

    CONSTRAINT "Rack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "componentId" INTEGER NOT NULL,
    "rackId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("componentId","rackId")
);

-- CreateTable
CREATE TABLE "ProjectComponent" (
    "projectId" INTEGER NOT NULL,
    "componentId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reserved" BOOLEAN NOT NULL,

    CONSTRAINT "ProjectComponent_pkey" PRIMARY KEY ("projectId","componentId")
);

-- CreateTable
CREATE TABLE "ProjectLog" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "status" "Status" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_rackId_fkey" FOREIGN KEY ("rackId") REFERENCES "Rack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectComponent" ADD CONSTRAINT "ProjectComponent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectComponent" ADD CONSTRAINT "ProjectComponent_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectLog" ADD CONSTRAINT "ProjectLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
