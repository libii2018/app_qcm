/**
 * Instance singleton de PrismaClient
 * 
 * Cette approche évite de créer plusieurs connexions à la base de données
 * et permet de facilement mocker le client dans les tests.
 */

import { PrismaClient } from '@prisma/client';

// Créer un singleton de PrismaClient
const prisma = new PrismaClient();

// Gérer proprement la fermeture de la connexion
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;
