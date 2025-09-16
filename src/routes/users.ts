import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from './auth';

const router = express.Router();
const prisma = new PrismaClient();

// Buscar todos os usuários
router.get('/', authenticateToken, async (req: any, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        pointsTotal: true,
        createdAt: true,
        _count: {
          select: {
            tasksResponsible: {
              where: { stage: 'CONCLUIDO' }
            },
            badges: true
          }
        }
      },
      orderBy: { pointsTotal: 'desc' }
    });

    // Formatar resposta
    const formattedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      pointsTotal: user.pointsTotal,
      tasksCompleted: user._count.tasksResponsible,
      badgesCount: user._count.badges,
      createdAt: user.createdAt
    }));

    res.json(formattedUsers);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
});

// Buscar usuário por ID
router.get('/:id', authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        tasksResponsible: {
          where: { stage: 'CONCLUIDO' },
          select: {
            id: true,
            title: true,
            points: true,
            concludedAt: true
          },
          orderBy: { concludedAt: 'desc' }
        },
        badges: {
          include: {
            badge: true
          }
        },
        goals: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      pointsTotal: user.pointsTotal,
      tasksCompleted: user.tasksResponsible,
      badges: user.badges,
      goals: user.goals
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
});

// Atualizar usuário
router.put('/:id', authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { name, role } = req.body;
    const { userId, role: userRole } = req.user;

    // Verificar permissões (apenas admin pode alterar roles)
    if (role && userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Apenas administradores podem alterar roles' });
    }

    // Usuários só podem editar seus próprios dados (exceto admins)
    if (userRole !== 'ADMIN' && userId !== id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(role && { role })
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        pointsTotal: true
      }
    });

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

// Deletar usuário
router.delete('/:id', authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user;

    // Verificar permissões
    if (role !== 'ADMIN' && userId !== id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    await prisma.user.delete({
      where: { id }
    });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar usuário' });
  }
});

// Buscar ranking de usuários
router.get('/ranking/top', authenticateToken, async (req: any, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        pointsTotal: true,
        _count: {
          select: {
            tasksResponsible: {
              where: { stage: 'CONCLUIDO' }
            },
            badges: true
          }
        }
      },
      orderBy: { pointsTotal: 'desc' },
      take: limit
    });

    const ranking = users.map((user, index) => ({
      rank: index + 1,
      id: user.id,
      name: user.name,
      pointsTotal: user.pointsTotal,
      tasksCompleted: user._count.tasksResponsible,
      badgesCount: user._count.badges
    }));

    res.json(ranking);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar ranking' });
  }
});

export default router;