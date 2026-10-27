import { PrismaClient, User, Quiz } from '@prisma/client';
import { hash } from 'bcrypt';
import { QuizJson as SharedQuiz } from '@qcm/shared';

const prisma = new PrismaClient();

// Quiz d'exemple 1 : Verbes irréguliers en anglais (texte seulement)
const irregularVerbsQuiz: SharedQuiz = {
  schemaVersion: 1,
  id: 'quiz-001',
  title: 'Verbes irréguliers - Niveau B1',
  subject: 'Anglais',
  description: 'Apprenez les verbes irréguliers les plus courants en anglais',
  tags: ['grammaire', 'verbes', 'irréguliers'],
  difficulty: 2,
  questions: [
    {
      id: 'q1',
      prompt: [
        { type: 'text', value: 'Quel est le prétérit de « go » ?' }
      ],
      options: [
        { id: 'a', content: [{ type: 'text', value: 'goed' }], correct: false },
        { id: 'b', content: [{ type: 'text', value: 'went' }], correct: true },
        { id: 'c', content: [{ type: 'text', value: 'gone' }], correct: false },
        { id: 'd', content: [{ type: 'text', value: 'goes' }], correct: false }
      ],
      multiple: false,
      hint: 'C\'est un verbe très irrégulier',
      explanation: '« go » devient « went » au prétérit et « gone » au participe passé.',
      tags: ['verbes irréguliers', 'prétérit'],
      difficulty: 1
    },
    {
      id: 'q2',
      prompt: [
        { type: 'text', value: 'Quel est le participe passé de « eat » ?' }
      ],
      options: [
        { id: 'a', content: [{ type: 'text', value: 'eated' }], correct: false },
        { id: 'b', content: [{ type: 'text', value: 'ate' }], correct: false },
        { id: 'c', content: [{ type: 'text', value: 'eaten' }], correct: true },
        { id: 'd', content: [{ type: 'text', value: 'eating' }], correct: false }
      ],
      multiple: false,
      hint: 'Le participe passé est différent du prétérit',
      explanation: '« eat » → « ate » (prétérit) → « eaten » (participe passé).',
      tags: ['verbes irréguliers', 'participe passé'],
      difficulty: 2
    },
    {
      id: 'q3',
      prompt: [
        { type: 'text', value: 'Quel verbe a la forme correcte au prétérit : « She ______ a beautiful song » ?' }
      ],
      options: [
        { id: 'a', content: [{ type: 'text', value: 'sang' }], correct: true },
        { id: 'b', content: [{ type: 'text', value: 'singed' }], correct: false },
        { id: 'c', content: [{ type: 'text', value: 'sing' }], correct: false },
        { id: 'd', content: [{ type: 'text', value: 'sung' }], correct: false }
      ],
      multiple: false,
      hint: 'Le prétérit de « sing » est irrégulier',
      explanation: '« sing » devient « sang » au prétérit et « sung » au participe passé.',
      tags: ['verbes irréguliers', 'prétérit'],
      difficulty: 2
    },
    {
      id: 'q4',
      prompt: [
        { type: 'text', value: 'Sélectionnez TOUTES les formes correctes du verbe « break »' }
      ],
      options: [
        { id: 'a', content: [{ type: 'text', value: 'broke' }], correct: true },
        { id: 'b', content: [{ type: 'text', value: 'broken' }], correct: true },
        { id: 'c', content: [{ type: 'text', value: 'breaked' }], correct: false },
        { id: 'd', content: [{ type: 'text', value: 'brake' }], correct: false }
      ],
      multiple: true,
      hint: 'Ce verbe a deux formes différentes pour le prétérit et le participe passé',
      explanation: '« break » → « broke » (prétérit) → « broken » (participe passé).',
      tags: ['verbes irréguliers', 'prétérit', 'participe passé', 'réponse multiple'],
      difficulty: 3
    },
    {
      id: 'q5',
      prompt: [
        { type: 'text', value: 'Quelle est la forme correcte : « He ______ to Paris last year » ?' }
      ],
      options: [
        { id: 'a', content: [{ type: 'text', value: 'goed' }], correct: false },
        { id: 'b', content: [{ type: 'text', value: 'went' }], correct: true },
        { id: 'c', content: [{ type: 'text', value: 'gone' }], correct: false },
        { id: 'd', content: [{ type: 'text', value: 'goes' }], correct: false }
      ],
      multiple: false,
      hint: 'Pensez au verbe « aller » en anglais',
      explanation: 'La phrase correcte est « He went to Paris last year » (Il est allé à Paris l\'an dernier).',
      tags: ['verbes irréguliers', 'prétérit', 'phrase'],
      difficulty: 1
    }
  ]
};

// Quiz d'exemple 2 : Quiz multimédia (image + audio) - Vocabulaire
// Note: En réalité, les médias devraient être uploadés séparément, mais pour le seed,
// nous utilisons des URLs de démonstration
const multimediaQuiz: SharedQuiz = {
  schemaVersion: 1,
  id: 'quiz-002',
  title: 'Vocabulaire des animaux - avec médias',
  subject: 'Anglais',
  description: 'Apprenez le vocabulaire des animaux en anglais avec images et sons',
  tags: ['vocabulaire', 'animaux', 'multimédia'],
  difficulty: 1,
  questions: [
    {
      id: 'q1',
      prompt: [
        { type: 'text', value: 'Quel animal est montré sur l\'image ?' },
        { 
          type: 'image', 
          src: 'media/cat.jpg',
          alt: 'Photo d\'un chat noir et blanc'
        }
      ],
      options: [
        { id: 'a', content: [{ type: 'text', value: 'Dog' }], correct: false },
        { id: 'b', content: [{ type: 'text', value: 'Cat' }], correct: true },
        { id: 'c', content: [{ type: 'text', value: 'Bird' }], correct: false },
        { id: 'd', content: [{ type: 'text', value: 'Fish' }], correct: false }
      ],
      multiple: false,
      hint: 'Cet animal aime les poissons et faire des siestes',
      explanation: 'L\'image montre un chat (Cat en anglais).',
      tags: ['animaux', 'images'],
      difficulty: 1
    },
    {
      id: 'q2',
      prompt: [
        { type: 'text', value: 'Écoutez le son et identifiez l\'animal' },
        { 
          type: 'audio', 
          src: 'media/dog-bark.mp3',
          alt: 'Aboiement de chien'
        }
      ],
      options: [
        { id: 'a', content: [{ type: 'text', value: 'Cat' }], correct: false },
        { id: 'b', content: [{ type: 'text', value: 'Dog' }], correct: true },
        { id: 'c', content: [{ type: 'text', value: 'Cow' }], correct: false },
        { id: 'd', content: [{ type: 'text', value: 'Sheep' }], correct: false }
      ],
      multiple: false,
      hint: 'Ce son est produit par le meilleur ami de l\'homme',
      explanation: 'Le son est un aboiement, produit par un chien (Dog en anglais).',
      tags: ['animaux', 'audio', 'écoute'],
      difficulty: 1
    },
    {
      id: 'q3',
      prompt: [
        { type: 'text', value: 'Associez l\'image à l\'animal correct' },
        { 
          type: 'image', 
          src: 'media/bird.jpg',
          alt: 'Photo d\'un oiseau coloré'
        }
      ],
      options: [
        { 
          id: 'a', 
          content: [
            { type: 'text', value: 'Elephant' },
            { type: 'image', src: 'media/elephant.jpg', alt: 'Éléphant' }
          ], 
          correct: false 
        },
        { 
          id: 'b', 
          content: [
            { type: 'text', value: 'Bird' },
            { type: 'image', src: 'media/bird-icon.jpg', alt: 'Icône d\'oiseau' }
          ], 
          correct: true 
        },
        { 
          id: 'c', 
          content: [
            { type: 'text', value: 'Lion' },
            { type: 'image', src: 'media/lion.jpg', alt: 'Lion' }
          ], 
          correct: false 
        },
        { 
          id: 'd', 
          content: [
            { type: 'text', value: 'Monkey' },
            { type: 'image', src: 'media/monkey.jpg', alt: 'Singe' }
          ], 
          correct: false 
        }
      ],
      multiple: false,
      hint: 'L\'animal sur l\'image a des ailes',
      explanation: 'L\'image montre un oiseau (Bird en anglais).',
      tags: ['animaux', 'images', 'association'],
      difficulty: 2
    }
  ]
};

async function main() {
  console.log('🌱 Démarrage du seed de la base de données...');

  try {
    // Créer un utilisateur de test
    const hashedPassword = await hash('password123', 10);
    
    const user = await prisma.user.upsert({
      where: { email: 'demo@example.com' },
      update: {},
      create: {
        email: 'demo@example.com',
        passwordHash: hashedPassword,
        streak: 5,
        dailyGoal: 20
      }
    });

    console.log('✅ Utilisateur de test créé:', user.email);

    // Créer les quiz pour cet utilisateur
    const quiz1 = await prisma.quiz.upsert({
      where: { id: irregularVerbsQuiz.id },
      update: {},
      create: {
        id: irregularVerbsQuiz.id,
        userId: user.id,
        title: irregularVerbsQuiz.title,
        subject: irregularVerbsQuiz.subject,
        description: irregularVerbsQuiz.description,
        tags: JSON.stringify(irregularVerbsQuiz.tags),
        difficulty: irregularVerbsQuiz.difficulty,
        jsonContent: JSON.stringify(irregularVerbsQuiz)
      }
    });

    console.log('✅ Quiz créé:', quiz1.title);

    const quiz2 = await prisma.quiz.upsert({
      where: { id: multimediaQuiz.id },
      update: {},
      create: {
        id: multimediaQuiz.id,
        userId: user.id,
        title: multimediaQuiz.title,
        subject: multimediaQuiz.subject,
        description: multimediaQuiz.description,
        tags: JSON.stringify(multimediaQuiz.tags),
        difficulty: multimediaQuiz.difficulty,
        jsonContent: JSON.stringify(multimediaQuiz)
      }
    });

    console.log('✅ Quiz créé:', quiz2.title);

    // Créer quelques ReviewState pour la démonstration
    const questions = [
      { questionId: 'quiz-001-q1', quizId: 'quiz-001' },
      { questionId: 'quiz-001-q2', quizId: 'quiz-001' },
      { questionId: 'quiz-002-q1', quizId: 'quiz-002' }
    ];

    for (const q of questions) {
      await prisma.reviewState.upsert({
        where: {
          userId_questionId: {
            userId: user.id,
            questionId: q.questionId
          }
        },
        update: {},
        create: {
          userId: user.id,
          questionId: q.questionId,
          quizId: q.quizId,
          nextReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Demain
          interval: 1,
          easeFactor: 2.5,
          repetitionCount: 1,
          consecutiveCorrect: 1,
          consecutiveIncorrect: 0
        }
      });
    }

    console.log('✅ États de révision créés pour démonstration');

    // Créer quelques AnswerEvent pour la démonstration
    const answers = [
      {
        quizId: 'quiz-001',
        questionId: 'quiz-001-q1',
        correct: true,
        responseTime: 5000,
        usedHint: false,
        selectedOptions: ['b'],
        tags: ['verbes irréguliers', 'prétérit'],
        subject: 'Anglais',
        difficulty: 1
      },
      {
        quizId: 'quiz-001',
        questionId: 'quiz-001-q2',
        correct: false,
        responseTime: 8000,
        usedHint: true,
        selectedOptions: ['a'],
        tags: ['verbes irréguliers', 'participe passé'],
        subject: 'Anglais',
        difficulty: 2
      },
      {
        quizId: 'quiz-002',
        questionId: 'quiz-002-q1',
        correct: true,
        responseTime: 3000,
        usedHint: false,
        selectedOptions: ['b'],
        tags: ['animaux', 'images'],
        subject: 'Anglais',
        difficulty: 1
      }
    ];

    for (const answer of answers) {
      await prisma.answerEvent.create({
        data: {
          userId: user.id,
          quizId: answer.quizId,
          questionId: answer.questionId,
          correct: answer.correct,
          responseTime: answer.responseTime,
          usedHint: answer.usedHint,
          selectedOptions: JSON.stringify(answer.selectedOptions),
          tags: JSON.stringify(answer.tags),
          subject: answer.subject,
          difficulty: answer.difficulty,
          timestamp: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)) // Aléatoire dans la dernière semaine
        }
      });
    }

    console.log('✅ Événements de réponse créés pour démonstration');

    console.log('\n🎉 Seed terminé avec succès !');
    console.log(`   - Utilisateur: ${user.email} (mot de passe: password123)`);
    console.log(`   - Quiz créés: ${quiz1.title}, ${quiz2.title}`);
    console.log(`   - Données de démonstration ajoutées`);
    console.log('\nPour tester:');
    console.log('   1. Lancez le serveur: npm run dev');
    console.log('   2. Connectez-vous avec: demo@example.com / password123');
    console.log('   3. Explorez l\'application !');

  } catch (error) {
    console.error('❌ Erreur lors du seed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
