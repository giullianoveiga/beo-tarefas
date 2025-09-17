const express = require('express');const express = require('express');

const cors = require('cors');const cors = require('cors');

const { PrismaClient } = require('@prisma/client');const { PrismaClient } = require('@prisma/client');

const cacheService = require('./src/services/cacheService');const cacheService = require('./src/services/cacheService');

require('dotenv').config();require('dotenv').config();



const app = express();
const PORT = process.env.PORT || 3001;

// Inicializar Prisma Client
const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Task Management API with PostgreSQL and Redis is running',
    timestamp: new Date().toISOString()
  });
});

// Testar conexão com banco
app.get('/api/test-db', async (req, res) => {
  try {
    await prisma.$connect();
    res.json({
      status: 'OK',
      message: 'Conexão com PostgreSQL estabelecida com sucesso'
    });
  } catch (error) {
    console.error('Erro na conexão com banco:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Erro na conexão com PostgreSQL',
      error: error.message
    });
  }
});

// Testar cache Redis
app.get('/api/test-cache', async (req, res) => {
  try {
    const cacheInfo = await cacheService.getInfo();
    res.json({
      status: 'OK',
      message: 'Informações do cache Redis',
      cache: cacheInfo
    });
  } catch (error) {
    console.error('Erro ao testar cache:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Erro no cache Redis',
      error: error.message
    });
  }
});

// Listar tarefas com cache
app.get('/api/tasks', async (req, res) => {
  try {
    const { stage, responsibleId, creatorId } = req.query;

    // Tentar buscar do cache primeiro
    const cacheKey = `tasks:${stage || 'all'}:${responsibleId || 'all'}:${creatorId || 'all'}`;
    let tasks = await cacheService.get(cacheKey);

    if (!tasks) {
      // Se não estiver no cache, buscar do banco
      const where = {};
      if (stage) where.stage = stage;
      if (responsibleId) where.responsibleId = responsibleId;
      if (creatorId) where.creatorId = creatorId;

      tasks = await prisma.task.findMany({
        where,
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

      // Salvar no cache por 5 minutos
      await cacheService.set(cacheKey, tasks, 300);
    }

    res.json(tasks);
  } catch (error) {
    console.error('Erro ao listar tarefas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar tarefa (invalida cache)
app.post('/api/tasks', async (req, res) => {
  try {
    const { title, description, complexity, priority, responsibleId } = req.body;

    // Calcular pontos baseado na complexidade
    const points = complexity === 'COMPLEXA' ? 4 : complexity === 'NORMAL' ? 2 : 1;

    const task = await prisma.task.create({
      data: {
        title,
        description,
        complexity,
        priority: priority || 'NORMAL',
        responsibleId,
        creatorId: req.user?.id,
        points,
        stage: 'EM_ABERTO'
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

    // Invalidar cache relacionado
    await cacheService.invalidateTasks();

    res.status(201).json(task);
  } catch (error) {
    console.error('Erro ao criar tarefa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar tarefa (invalida cache)
app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, complexity, priority, responsibleId, stage } = req.body;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (complexity !== undefined) updateData.complexity = complexity;
    if (priority !== undefined) updateData.priority = priority;
    if (responsibleId !== undefined) updateData.responsibleId = responsibleId;
    if (stage !== undefined) updateData.stage = stage;

    // Se está mudando para CONCLUIDO, adicionar timestamp e pontos
    if (stage === 'CONCLUIDO') {
      updateData.concludedAt = new Date();

      // Atualizar pontos do usuário
      const task = await prisma.task.findUnique({ where: { id } });
      if (task && task.responsibleId) {
        await prisma.user.update({
          where: { id: task.responsibleId },
          data: {
            pointsTotal: {
              increment: task.points
            }
          }
        });
      }
    }

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        responsible: {
          select: { id: true, name: true, email: true }
        },
        creator: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    // Invalidar cache
    await cacheService.invalidateTasks();

    res.json(task);
  } catch (error) {
    console.error('Erro ao atualizar tarefa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar tarefa (invalida cache)
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.task.delete({
      where: { id }
    });

    // Invalidar cache
    await cacheService.invalidateTasks();

    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao deletar tarefa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ========= ROTAS DE COMENTÁRIOS =========

// Buscar comentários de uma tarefa
app.get('/api/comments/task/:taskId', async (req, res) => {
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
    console.error('Erro ao buscar comentários:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar comentário
app.post('/api/comments', async (req, res) => {
  try {
    const { content, taskId, authorId } = req.body;

    if (!content || !taskId || !authorId) {
      return res.status(400).json({ error: 'Conteúdo, ID da tarefa e ID do autor são obrigatórios' });
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
    console.error('Erro ao criar comentário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar comentário
app.put('/api/comments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { content, authorId } = req.body;

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

    if (existingComment.authorId !== authorId) {
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
    console.error('Erro ao atualizar comentário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar comentário
app.delete('/api/comments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { authorId } = req.body;

    // Verificar se o comentário existe e pertence ao usuário
    const existingComment = await prisma.comment.findUnique({
      where: { id }
    });

    if (!existingComment) {
      return res.status(404).json({ error: 'Comentário não encontrado' });
    }

    if (existingComment.authorId !== authorId) {
      return res.status(403).json({ error: 'Você não tem permissão para deletar este comentário' });
    }

    await prisma.comment.delete({
      where: { id }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao deletar comentário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar usuários com cache
app.get('/api/users', async (req, res) => {
  try {
    // Tentar buscar do cache
    let users = await cacheService.getUsers();

    if (!users) {
      users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          pointsTotal: true,
          createdAt: true
        },
        orderBy: { name: 'asc' }
      });

      // Salvar no cache
      await cacheService.setUsers(users, 300);
    }

    res.json(users);
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Inicialização do servidor
async function startServer() {
  try {
    // Testar conexão com o banco
    await prisma.$connect();
    console.log('✅ Conectado ao PostgreSQL com sucesso!');

    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log(`📊 API disponível em: http://localhost:${PORT}/api`);
      console.log(`🔄 Cache Redis integrado`);
    });
  } catch (error) {
    console.error('❌ Erro ao conectar ao banco de dados:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Encerrando servidor...');
  await prisma.$disconnect();
  await cacheService.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Encerrando servidor...');
  await prisma.$disconnect();
  await cacheService.disconnect();
  process.exit(0);
});

startServer();