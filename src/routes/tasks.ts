import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from './auth';

const router = express.Router();
const prisma = new PrismaClient();

// Buscar todas as tarefas
router.get('/', authenticateToken, async (req: any, res) => {
  try {
    const tasks = await prisma.task.findMany({
      include: {
        responsible: {
          select: { id: true, name: true, email: true }
        },
        creator: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: [
        { stage: 'asc' },
        { order: 'asc' }
      ]
    });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar tarefas' });
  }
});

// Buscar tarefa por ID
router.get('/:id', authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        responsible: {
          select: { id: true, name: true, email: true }
        },
        creator: {
          select: { id: true, name: true, email: true }
        },
        histories: {
          include: {
            changedBy: {
              select: { id: true, name: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!task) {
      return res.status(404).json({ error: 'Tarefa não encontrada' });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar tarefa' });
  }
});

// Criar nova tarefa
router.post('/', authenticateToken, async (req: any, res) => {
  try {
    const { title, description, complexity, priority, responsibleId } = req.body;
    const { userId } = req.user;

    // Calcular pontos baseado na complexidade
    const points = complexity === 'SIMPLES' ? 1 :
                   complexity === 'NORMAL' ? 2 : 4;

    const task = await prisma.task.create({
      data: {
        title,
        description,
        complexity,
        priority,
        points,
        responsibleId,
        creatorId: userId
      },
      include: {
        responsible: {
          select: { id: true, name: true, email: true }
        },
        creator: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar tarefa' });
  }
});

// Atualizar tarefa
router.put('/:id', authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { title, description, complexity, priority, responsibleId, stage } = req.body;
    const { userId } = req.user;

    // Buscar tarefa atual
    const currentTask = await prisma.task.findUnique({
      where: { id }
    });

    if (!currentTask) {
      return res.status(404).json({ error: 'Tarefa não encontrada' });
    }

    // Se o stage mudou, registrar no histórico
    if (stage && stage !== currentTask.stage) {
      await prisma.taskHistory.create({
        data: {
          taskId: id,
          fromStage: currentTask.stage,
          toStage: stage,
          changedById: userId
        }
      });

      // Se movendo para CONCLUIDO, calcular pontos
      if (stage === 'CONCLUIDO') {
        const points = currentTask.points;
        await prisma.user.update({
          where: { id: currentTask.responsibleId || userId },
          data: {
            pointsTotal: {
              increment: points
            }
          }
        });

        // Verificar badges
        await checkBadgeAchievements(currentTask.responsibleId || userId);
      }
    }

    // Calcular pontos baseado na complexidade
    const points = complexity === 'SIMPLES' ? 1 :
                   complexity === 'NORMAL' ? 2 : 4;

    const task = await prisma.task.update({
      where: { id },
      data: {
        title,
        description,
        complexity,
        priority,
        points,
        responsibleId,
        stage,
        ...(stage === 'CONCLUIDO' && !currentTask.concludedAt && { concludedAt: new Date() })
      },
      include: {
        responsible: {
          select: { id: true, name: true, email: true }
        },
        creator: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar tarefa' });
  }
});

// Deletar tarefa
router.delete('/:id', authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;

    await prisma.task.delete({
      where: { id }
    });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar tarefa' });
  }
});

// Função auxiliar para verificar conquistas
async function checkBadgeAchievements(userId: string) {
  try {
    // Buscar estatísticas do usuário
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        tasksResponsible: {
          where: { stage: 'CONCLUIDO' }
        },
        badges: {
          include: {
            badge: true
          }
        }
      }
    });

    if (!user) return;

    const tasksCompleted = user.tasksResponsible.length;
    const pointsTotal = user.pointsTotal;
    const existingBadgeCodes = user.badges.map(b => b.badge.code);

    // Verificar conquistas
    const achievements = [
      { code: 'INICIANTE', threshold: 1, type: 'tasks', value: tasksCompleted },
      { code: 'PRODUTIVO_10', threshold: 10, type: 'tasks', value: tasksCompleted },
      { code: 'INCANSAVEL_30', threshold: 30, type: 'tasks', value: tasksCompleted },
      { code: 'ESPECIALISTA_100P', threshold: 100, type: 'points', value: pointsTotal }
    ];

    for (const achievement of achievements) {
      if (achievement.value >= achievement.threshold && !existingBadgeCodes.includes(achievement.code)) {
        const badge = await prisma.badge.findUnique({
          where: { code: achievement.code }
        });

        if (badge) {
          await prisma.userBadge.create({
            data: {
              userId,
              badgeId: badge.id
            }
          });
        }
      }
    }
  } catch (error) {
    console.error('Erro ao verificar conquistas:', error);
  }
}

export default router;