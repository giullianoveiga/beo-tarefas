import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from './auth';

const router = express.Router();
const prisma = new PrismaClient();

// Buscar todos os badges
router.get('/badges', authenticateToken, async (req: any, res) => {
  try {
    const badges = await prisma.badge.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });
    res.json(badges);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar badges' });
  }
});

// Buscar badges do usuário
router.get('/user/:userId/badges', authenticateToken, async (req: any, res) => {
  try {
    const { userId } = req.params;

    const userBadges = await prisma.userBadge.findMany({
      where: { userId },
      include: {
        badge: true
      },
      orderBy: { awardedAt: 'desc' }
    });

    res.json(userBadges);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar badges do usuário' });
  }
});

// Buscar estatísticas de gamificação
router.get('/stats', authenticateToken, async (req: any, res) => {
  try {
    const [
      totalUsers,
      totalTasks,
      totalPoints,
      totalBadges
    ] = await Promise.all([
      prisma.user.count(),
      prisma.task.count({ where: { stage: 'CONCLUIDO' } }),
      prisma.user.aggregate({
        _sum: { pointsTotal: true }
      }),
      prisma.userBadge.count()
    ]);

    // Buscar distribuição de complexidade
    const complexityStats = await prisma.task.groupBy({
      by: ['complexity'],
      where: { stage: 'CONCLUIDO' },
      _count: true
    });

    // Buscar top usuários
    const topUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        pointsTotal: true
      },
      orderBy: { pointsTotal: 'desc' },
      take: 5
    });

    res.json({
      overview: {
        totalUsers,
        totalTasks,
        totalPoints: totalPoints._sum.pointsTotal || 0,
        totalBadges
      },
      complexityDistribution: complexityStats,
      topUsers
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

// Buscar metas mensais do usuário
router.get('/goals/:userId', authenticateToken, async (req: any, res) => {
  try {
    const { userId } = req.params;
    const { year, month } = req.query;

    const where: any = { userId };
    if (year && month) {
      where.year = parseInt(year as string);
      where.month = parseInt(month as string);
    }

    const goals = await prisma.userMonthlyGoal.findMany({
      where,
      orderBy: [
        { year: 'desc' },
        { month: 'desc' }
      ]
    });

    res.json(goals);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar metas' });
  }
});

// Criar meta mensal
router.post('/goals', authenticateToken, async (req: any, res) => {
  try {
    const { userId, year, month, targetPoints } = req.body;
    const { userId: currentUserId, role } = req.user;

    // Verificar permissões (usuário pode criar meta para si ou admin para qualquer um)
    if (role !== 'ADMIN' && currentUserId !== userId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const goal = await prisma.userMonthlyGoal.upsert({
      where: {
        userId_year_month: {
          userId,
          year: parseInt(year),
          month: parseInt(month)
        }
      },
      update: { targetPoints: parseInt(targetPoints) },
      create: {
        userId,
        year: parseInt(year),
        month: parseInt(month),
        targetPoints: parseInt(targetPoints)
      }
    });

    res.status(201).json(goal);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar meta' });
  }
});

// Buscar progresso mensal
router.get('/progress/:userId/:year/:month', authenticateToken, async (req: any, res) => {
  try {
    const { userId, year, month } = req.params;

    // Buscar meta do mês
    const goal = await prisma.userMonthlyGoal.findUnique({
      where: {
        userId_year_month: {
          userId,
          year: parseInt(year),
          month: parseInt(month)
        }
      }
    });

    // Calcular pontos realizados no mês
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 1);

    const monthlyPoints = await prisma.task.aggregate({
      where: {
        responsibleId: userId,
        stage: 'CONCLUIDO',
        concludedAt: {
          gte: startDate,
          lt: endDate
        }
      },
      _sum: { points: true }
    });

    // Buscar tarefas concluídas no mês
    const completedTasks = await prisma.task.findMany({
      where: {
        responsibleId: userId,
        stage: 'CONCLUIDO',
        concludedAt: {
          gte: startDate,
          lt: endDate
        }
      },
      select: {
        id: true,
        title: true,
        points: true,
        concludedAt: true
      },
      orderBy: { concludedAt: 'desc' }
    });

    res.json({
      goal: goal?.targetPoints || 0,
      achieved: monthlyPoints._sum.points || 0,
      percentage: goal ? Math.round(((monthlyPoints._sum.points || 0) / goal.targetPoints) * 100) : 0,
      tasks: completedTasks
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar progresso' });
  }
});

export default router;