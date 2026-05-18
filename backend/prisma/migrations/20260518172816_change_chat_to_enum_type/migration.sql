/*
  Warnings:

  - You are about to drop the column `isGroup` on the `Chat` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ChatType" AS ENUM ('DIRECT', 'GROUP');

-- AlterTable
ALTER TABLE "Chat" DROP COLUMN "isGroup",
ADD COLUMN     "type" "ChatType" NOT NULL DEFAULT 'DIRECT';
