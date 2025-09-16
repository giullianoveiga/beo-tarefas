import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Criar badges iniciais
  const badges = await Promise.all([
    prisma.badge.upsert({
      where: { code: 'INICIANTE' },
      update: {},
      create: {
        code: 'INICIANTE',
        name: 'Iniciante',
        description: 'Primeira tarefa concluída',
        criteria: '{"tasks_completed": 1}'
      }
    }),
    prisma.badge.upsert({
      where: { code: 'PRODUTIVO_10' },
      update: {},
      create: {
        code: 'PRODUTIVO_10',
        name: 'Produtivo',
        description: '10 tarefas concluídas',
        criteria: '{"tasks_completed": 10}'
      }
    }),
    prisma.badge.upsert({
      where: { code: 'INCANSAVEL_30' },
      update: {},
      create: {
        code: 'INCANSAVEL_30',
        name: 'Incansável',
        description: '30 tarefas concluídas',
        criteria: '{"tasks_completed": 30}'
      }
    }),
    prisma.badge.upsert({
      where: { code: 'ESPECIALISTA_100P' },
      update: {},
      create: {
        code: 'ESPECIALISTA_100P',
        name: 'Especialista',
        description: '100 pontos acumulados',
        criteria: '{"points_total": 100}'
      }
    })
  ]);

  // Criar usuário admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@empresa.com' },
    update: {},
    create: {
      email: 'admin@empresa.com',
      name: 'Administrador',
      role: 'ADMIN'
    }
  });

  // Criar alguns usuários de exemplo
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'gestor@empresa.com' },
      update: {},
      create: {
        email: 'gestor@empresa.com',
        name: 'João Gestor',
        role: 'GESTOR'
      }
    }),
    prisma.user.upsert({
      where: { email: 'colab1@empresa.com' },
      update: {},
      create: {
        email: 'colab1@empresa.com',
        name: 'Maria Silva',
        role: 'COLABORADOR'
      }
    }),
    prisma.user.upsert({
      where: { email: 'colab2@empresa.com' },
      update: {},
      create: {
        email: 'colab2@empresa.com',
        name: 'Pedro Santos',
        role: 'COLABORADOR'
      }
    })
  ]);

  // Criar algumas tarefas de exemplo
  const tasks = await Promise.all([
    prisma.task.create({
      data: {
        title: 'Implementar sistema de autenticação',
        description: 'Implementar login com Azure AD e fallback local',
        complexity: 'COMPLEXA',
        priority: 'ALTA',
        creatorId: admin.id,
        responsibleId: users[0].id
      }
    }),
    prisma.task.create({
      data: {
        title: 'Criar interface do Kanban',
        description: 'Desenvolver board Kanban com drag and drop',
        complexity: 'NORMAL',
        priority: 'NORMAL',
        creatorId: admin.id,
        responsibleId: users[1].id
      }
    }),
    prisma.task.create({
      data: {
        title: 'Sistema de gamificação',
        description: 'Implementar badges e sistema de pontos',
        complexity: 'COMPLEXA',
        priority: 'ALTA',
        creatorId: admin.id,
        responsibleId: users[2].id
      }
    })
  ]);

  console.log('✅ Database seeded successfully!');
  console.log(`Created ${badges.length} badges`);
  console.log(`Created ${users.length + 1} users`);
  console.log(`Created ${tasks.length} tasks`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });