import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from './auth';

const router = express.Router();
const prisma = new PrismaClient();

// Buscar comentários de uma tarefa
router.get('/task/:taskId', authenticateToken, async (req: any, res) => {
  try {
    const { taskId } = req.params;
    const comments = await prisma.comment.findMany({
      where: { taskId },
      include: {
        author: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar comentários' });
  }
});

// Criar comentário
router.post('/', authenticateToken, async (req: any, res) => {
  try {
    const { content, taskId } = req.body;
    const authorId = req.user.id;

    if (!content || !taskId) {
      return res.status(400).json({ error: 'Conteúdo e ID da tarefa são obrigatórios' });
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        taskId,
        authorId
      },
      include: {
        author: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar comentário' });
  }
});

// Atualizar comentário
router.put('/:id', authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content) {
      return res.status(400).json({ error: 'Conteúdo é obrigatório' });
    }

    // Verificar se o comentário existe e pertence ao usuário
    const existingComment = await prisma.comment.findUnique({
      where: { id }
    });

    if (!existingComment) {
      return res.status(404).json({ error: 'Comentário não encontrado' });
    }

    if (existingComment.authorId !== userId) {
      return res.status(403).json({ error: 'Você não tem permissão para editar este comentário' });
    }

    const comment = await prisma.comment.update({
      where: { id },
      data: { content },
      include: {
        author: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.json(comment);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar comentário' });
  }
});

// Deletar comentário
router.delete('/:id', authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verificar se o comentário existe e pertence ao usuário
    const existingComment = await prisma.comment.findUnique({
      where: { id }
    });

    if (!existingComment) {
      return res.status(404).json({ error: 'Comentário não encontrado' });
    }

    if (existingComment.authorId !== userId) {
      return res.status(403).json({ error: 'Você não tem permissão para deletar este comentário' });
    }

    await prisma.comment.delete({
      where: { id }
    });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar comentário' });
  }
});

export default router;