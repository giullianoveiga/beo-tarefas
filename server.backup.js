const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors());
app.use(express.json());

// Debug: log the correct path
const frontendPath = path.join(__dirname, 'frontend', 'public');
console.log('Frontend path:', frontendPath);
console.log('Index.html exists:', fs.existsSync(path.join(frontendPath, 'index.html')));

// Serve static files from frontend public folder
app.use(express.static(path.join(__dirname, 'frontend', 'public')));

// Função auxiliar para verificar novos badges
function checkAndAwardBadges(userId, taskData) {
  const newBadges = [];
  
  // Simular dados do usuário para verificação
  const userStats = {
    tasksCompletedToday: 6, // Para demonstrar Workaholic
    tasksCompletedOnTime: 12, // Para demonstrar Pontual
    complexTasksCompleted: 3, // Para demonstrar Inovador
    commentsAdded: 15,
    totalTasks: 28,
    totalPoints: 85
  };
  
  // Verificar badge Workaholic (5+ tarefas em um dia)
  if (userStats.tasksCompletedToday >= 5) {
    newBadges.push({
      userId,
      badgeId: 5,
      badgeCode: 'WORKAHOLIC',
      earnedAt: new Date().toISOString()
    });
  }
  
  // Verificar badge Pontual (10 tarefas no prazo)
  if (userStats.tasksCompletedOnTime >= 10) {
    newBadges.push({
      userId,
      badgeId: 6,
      badgeCode: 'PONTUAL',
      earnedAt: new Date().toISOString()
    });
  }
  
  // Verificar badge Inovador (5 tarefas complexas)
  if (taskData.complexity === 'COMPLEXA' && userStats.complexTasksCompleted >= 5) {
    newBadges.push({
      userId,
      badgeId: 9,
      badgeCode: 'INOVADOR',
      earnedAt: new Date().toISOString()
    });
  }
  
  return newBadges;
}

app.use(express.static(path.join(__dirname, 'frontend', 'public')));

// API routes simples
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Usuários de teste
  const testUsers = [
    { id: 1, name: 'Admin User', email: 'admin@test.com', role: 'ADMIN', pointsTotal: 120 },
    { id: 2, name: 'Manager User', email: 'manager@test.com', role: 'GESTOR', pointsTotal: 85 },
    { id: 3, name: 'Regular User', email: 'user@test.com', role: 'COLABORADOR', pointsTotal: 45 },
    { id: 4, name: 'Developer User', email: 'dev@test.com', role: 'COLABORADOR', pointsTotal: 95 }
  ];
  
  const user = testUsers.find(u => u.email === email);
  
  if (!user) {
    return res.status(401).json({ error: 'Usuário não encontrado' });
  }
  
  // Simular token JWT (em produção seria um token real)
  const token = `fake-jwt-token-${user.id}`;
  
  res.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      pointsTotal: user.pointsTotal
    },
    token
  });
});

app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }
  
  // Extrair user ID do token fake
  const tokenParts = authHeader.split('-');
  const userId = parseInt(tokenParts[tokenParts.length - 1]);
  
  const testUsers = [
    { id: 1, name: 'Admin User', email: 'admin@test.com', role: 'ADMIN', pointsTotal: 120 },
    { id: 2, name: 'Manager User', email: 'manager@test.com', role: 'GESTOR', pointsTotal: 85 },
    { id: 3, name: 'Regular User', email: 'user@test.com', role: 'COLABORADOR', pointsTotal: 45 },
    { id: 4, name: 'Developer User', email: 'dev@test.com', role: 'COLABORADOR', pointsTotal: 95 }
  ];
  
  const user = testUsers.find(u => u.id === userId);
  
  if (!user) {
    return res.status(401).json({ error: 'Token inválido' });
  }
  
  res.json({ user });
});

// Basic API routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Task Management API is running' });
});

app.get('/api/tasks', (req, res) => {
  // Mock data expandido para testing
  const mockTasks = [
    {
      id: 1,
      title: 'Implementar login',
      description: 'Criar sistema de autenticação com Azure AD',
      stage: 'EM_ABERTO',
      complexity: 'COMPLEXA',
      priority: 'ALTA',
      responsibleId: 1,
      creatorId: 1,
      deadline: '2025-09-18T23:59:59Z',
      createdAt: '2025-09-15T10:00:00Z'
    },
    {
      id: 2,
      title: 'Configurar banco de dados',
      description: 'Configurar PostgreSQL e migrações',
      stage: 'ANDAMENTO',
      complexity: 'NORMAL',
      priority: 'NORMAL',
      responsibleId: 2,
      creatorId: 1,
      deadline: '2025-09-17T18:00:00Z',
      createdAt: '2025-09-15T11:00:00Z'
    },
    {
      id: 3,
      title: 'Criar interface do usuário',
      description: 'Desenvolver componentes React para dashboard',
      stage: 'ANALISE',
      complexity: 'NORMAL',
      priority: 'URGENTE',
      responsibleId: 3,
      creatorId: 2,
      deadline: '2025-09-16T17:00:00Z',
      createdAt: '2025-09-15T12:00:00Z'
    },
    {
      id: 4,
      title: 'Implementar gamificação',
      description: 'Sistema de pontos e badges para usuários',
      stage: 'CONCLUIDO',
      complexity: 'COMPLEXA',
      priority: 'NORMAL',
      responsibleId: 4,
      creatorId: 1,
      deadline: '2025-09-15T23:59:59Z',
      createdAt: '2025-09-14T09:00:00Z'
    }
  ];
  res.json(mockTasks);
});

app.post('/api/tasks', (req, res) => {
  const { title, description, complexity, priority, responsibleId, deadline } = req.body;
  
  // Simular criação de tarefa
  const newTask = {
    id: Date.now(),
    title,
    description,
    complexity,
    priority: priority || 'NORMAL',
    responsibleId: parseInt(responsibleId),
    deadline: deadline || null,
    creatorId: 1, // Em produção, viria do token do usuário
    stage: 'EM_ABERTO',
    createdAt: new Date().toISOString()
  };
  
  res.status(201).json(newTask);
});

app.put('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const { stage, title, description, complexity, priority, responsibleId, deadline } = req.body;
  
  // Simular atualização de tarefa
  const updatedTask = {
    id: parseInt(id),
    title,
    description,
    complexity,
    priority: priority || 'NORMAL',
    responsibleId,
    deadline: deadline || null,
    stage,
    updatedAt: new Date().toISOString()
  };
  
  // Verificar e conceder badges quando tarefa é concluída
  let newBadges = [];
  if (stage === 'CONCLUIDO') {
    newBadges = checkAndAwardBadges(responsibleId, updatedTask);
  }
  
  res.json({
    task: updatedTask,
    newBadges: newBadges
  });
});

app.delete('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  
  // Simular exclusão
  res.json({ message: `Tarefa ${id} excluída com sucesso` });
});

// Endpoint para verificar tarefas com prazos
app.get('/api/tasks/deadlines', (req, res) => {
  const now = new Date();
  const mockTasks = [
    {
      id: 1, title: 'Implementar login', deadline: '2025-09-18T23:59:59Z', 
      stage: 'EM_ABERTO', responsibleId: 1, priority: 'ALTA'
    },
    {
      id: 2, title: 'Configurar banco de dados', deadline: '2025-09-17T18:00:00Z', 
      stage: 'ANDAMENTO', responsibleId: 2, priority: 'NORMAL'
    },
    {
      id: 3, title: 'Criar interface do usuário', deadline: '2025-09-16T17:00:00Z', 
      stage: 'ANALISE', responsibleId: 3, priority: 'URGENTE'
    }
  ];
  
  const tasksWithDeadlines = mockTasks.map(task => {
    const deadline = new Date(task.deadline);
    const timeToDeadline = deadline - now;
    const daysToDeadline = Math.ceil(timeToDeadline / (1000 * 60 * 60 * 24));
    const hoursToDeadline = Math.ceil(timeToDeadline / (1000 * 60 * 60));
    
    return {
      ...task,
      isOverdue: timeToDeadline < 0,
      isDueSoon: timeToDeadline > 0 && timeToDeadline < (24 * 60 * 60 * 1000), // 24 horas
      daysToDeadline,
      hoursToDeadline,
      deadlineStatus: timeToDeadline < 0 ? 'overdue' : 
                     timeToDeadline < (24 * 60 * 60 * 1000) ? 'due_soon' : 'on_time'
    };
  });
  
  res.json(tasksWithDeadlines);
});

// ============ ADMIN ENDPOINTS ============

// Endpoint para gerenciamento de usuários (apenas admins)
app.get('/api/admin/users', (req, res) => {
  const allUsers = [
    { id: 1, name: 'Admin User', email: 'admin@test.com', role: 'ADMIN', pointsTotal: 120, tasksCompleted: 25, isActive: true, createdAt: '2025-09-01T10:00:00Z' },
    { id: 2, name: 'Manager User', email: 'manager@test.com', role: 'GESTOR', pointsTotal: 85, tasksCompleted: 18, isActive: true, createdAt: '2025-09-02T14:30:00Z' },
    { id: 3, name: 'Regular User', email: 'user@test.com', role: 'COLABORADOR', pointsTotal: 45, tasksCompleted: 12, isActive: true, createdAt: '2025-09-03T09:15:00Z' },
    { id: 4, name: 'Developer User', email: 'dev@test.com', role: 'COLABORADOR', pointsTotal: 95, tasksCompleted: 20, isActive: true, createdAt: '2025-09-04T11:45:00Z' },
    { id: 5, name: 'Inactive User', email: 'inactive@test.com', role: 'COLABORADOR', pointsTotal: 15, tasksCompleted: 3, isActive: false, createdAt: '2025-09-05T16:20:00Z' }
  ];
  
  res.json(allUsers);
});

// Atualizar usuário (apenas admins)
app.put('/api/admin/users/:id', (req, res) => {
  const { id } = req.params;
  const { name, email, role, isActive } = req.body;
  
  const updatedUser = {
    id: parseInt(id),
    name,
    email,
    role,
    isActive,
    updatedAt: new Date().toISOString()
  };
  
  res.json({ message: 'Usuário atualizado com sucesso', user: updatedUser });
});

// Criar novo usuário (apenas admins)
app.post('/api/admin/users', (req, res) => {
  const { name, email, role } = req.body;
  
  const newUser = {
    id: Date.now(),
    name,
    email,
    role: role || 'COLABORADOR',
    pointsTotal: 0,
    tasksCompleted: 0,
    isActive: true,
    createdAt: new Date().toISOString()
  };
  
  res.status(201).json(newUser);
});

// Configurações de badges (apenas admins)
app.get('/api/admin/badge-settings', (req, res) => {
  const badgeSettings = [
    { id: 1, code: 'INICIANTE', name: 'Iniciante', threshold: 1, type: 'tasks_completed', isActive: true },
    { id: 2, code: 'PRODUTIVO_10', name: 'Produtivo', threshold: 10, type: 'tasks_completed', isActive: true },
    { id: 3, code: 'ESPECIALISTA_100P', name: 'Especialista', threshold: 100, type: 'points_total', isActive: true },
    { id: 4, code: 'MESTRE_50_TAREFAS', name: 'Mestre das Tarefas', threshold: 50, type: 'tasks_completed', isActive: true },
    { id: 5, code: 'WORKAHOLIC', name: 'Workaholic', threshold: 5, type: 'daily_tasks', isActive: true },
    { id: 6, code: 'PONTUAL', name: 'Pontual', threshold: 10, type: 'on_time_tasks', isActive: true },
    { id: 7, code: 'LIDER_MES', name: 'Líder do Mês', threshold: 1, type: 'monthly_leader', isActive: true }
  ];
  
  res.json(badgeSettings);
});

// Atualizar configuração de badge
app.put('/api/admin/badge-settings/:id', (req, res) => {
  const { id } = req.params;
  const { threshold, isActive } = req.body;
  
  res.json({
    message: 'Configuração de badge atualizada',
    badgeId: parseInt(id),
    threshold,
    isActive,
    updatedAt: new Date().toISOString()
  });
});

// Estatísticas gerais do sistema (apenas admins)
app.get('/api/admin/system-stats', (req, res) => {
  const systemStats = {
    totalUsers: 5,
    activeUsers: 4,
    totalTasks: 847,
    completedTasks: 312,
    totalPoints: 1450,
    averageTasksPerUser: 8.5,
    systemUptime: '30 dias',
    badgesAwarded: 67,
    monthlyGrowth: {
      users: +15,
      tasks: +230,
      points: +890
    },
    topPerformers: [
      { name: 'Admin User', points: 120, efficiency: 95 },
      { name: 'Developer User', points: 95, efficiency: 88 },
      { name: 'Manager User', points: 85, efficiency: 82 }
    ]
  };
  
  res.json(systemStats);
});

// Configurações do sistema (apenas admins)
app.get('/api/admin/settings', (req, res) => {
  const systemSettings = {
    gamification: {
      pointsEnabled: true,
      badgesEnabled: true,
      leaderboardEnabled: true,
      pointsPerSimpleTask: 1,
      pointsPerNormalTask: 2,
      pointsPerComplexTask: 4
    },
    notifications: {
      emailEnabled: true,
      deadlineAlerts: true,
      badgeNotifications: true,
      weeklyReports: true
    },
    tasks: {
      allowSelfAssignment: true,
      requireDeadline: false,
      autoProgressTracking: true,
      maxTasksPerUser: 20
    },
    security: {
      passwordMinLength: 8,
      sessionTimeout: 480, // minutes
      maxLoginAttempts: 5,
      requireEmailVerification: false
    }
  };
  
  res.json(systemSettings);
});

// Atualizar configurações do sistema
app.put('/api/admin/settings', (req, res) => {
  const { category, settings } = req.body;
  
  res.json({
    message: `Configurações de ${category} atualizadas com sucesso`,
    category,
    settings,
    updatedAt: new Date().toISOString()
  });
});

// Logs de auditoria (apenas admins)
app.get('/api/admin/audit-logs', (req, res) => {
  const auditLogs = [
    {
      id: 1,
      action: 'USER_CREATED',
      userId: 1,
      userName: 'Admin User',
      details: 'Criou usuário Developer User',
      timestamp: '2025-09-16T10:30:00Z',
      ipAddress: '192.168.1.100'
    },
    {
      id: 2,
      action: 'BADGE_AWARDED',
      userId: 2,
      userName: 'Manager User',
      details: 'Conquistou badge Workaholic',
      timestamp: '2025-09-16T09:15:00Z',
      ipAddress: '192.168.1.101'
    },
    {
      id: 3,
      action: 'TASK_COMPLETED',
      userId: 3,
      userName: 'Regular User',
      details: 'Completou tarefa: Implementar login',
      timestamp: '2025-09-16T08:45:00Z',
      ipAddress: '192.168.1.102'
    },
    {
      id: 4,
      action: 'SETTINGS_CHANGED',
      userId: 1,
      userName: 'Admin User',
      details: 'Alterou configurações de gamificação',
      timestamp: '2025-09-15T16:20:00Z',
      ipAddress: '192.168.1.100'
    }
  ];
  
  res.json(auditLogs);
});

// Backup do sistema (apenas admins)
app.post('/api/admin/backup', (req, res) => {
  const backupInfo = {
    id: Date.now(),
    filename: `backup_${new Date().toISOString().split('T')[0]}.json`,
    size: '2.3 MB',
    createdAt: new Date().toISOString(),
    status: 'completed',
    includes: ['users', 'tasks', 'badges', 'settings', 'audit_logs']
  };
  
  res.json({
    message: 'Backup criado com sucesso',
    backup: backupInfo
  });
});

app.get('/api/users', (req, res) => {
  const mockUsers = [
    { id: 1, name: 'Admin User', email: 'admin@test.com', role: 'ADMIN', pointsTotal: 120 },
    { id: 2, name: 'Manager User', email: 'manager@test.com', role: 'GESTOR', pointsTotal: 85 },
    { id: 3, name: 'Regular User', email: 'user@test.com', role: 'COLABORADOR', pointsTotal: 45 },
    { id: 4, name: 'Developer User', email: 'dev@test.com', role: 'COLABORADOR', pointsTotal: 95 }
  ];
  res.json(mockUsers);
});

// Endpoints de Gamificação
app.get('/api/gamification/badges', (req, res) => {
  const badges = [
    {
      id: 1,
      code: 'INICIANTE',
      name: 'Iniciante',
      description: 'Complete sua primeira tarefa',
      icon: '🌟',
      condition: { type: 'tasks_completed', threshold: 1 }
    },
    {
      id: 2,
      code: 'PRODUTIVO_10',
      name: 'Produtivo',
      description: 'Complete 10 tarefas',
      icon: '⚡',
      condition: { type: 'tasks_completed', threshold: 10 }
    },
    {
      id: 3,
      code: 'ESPECIALISTA_100P',
      name: 'Especialista',
      description: 'Acumule 100 pontos',
      icon: '🏆',
      condition: { type: 'points_total', threshold: 100 }
    },
    {
      id: 4,
      code: 'MESTRE_50_TAREFAS',
      name: 'Mestre das Tarefas',
      description: 'Complete 50 tarefas',
      icon: '👑',
      condition: { type: 'tasks_completed', threshold: 50 }
    },
    {
      id: 5,
      code: 'WORKAHOLIC',
      name: 'Workaholic',
      description: 'Complete 5+ tarefas em um dia',
      icon: '🔥',
      condition: { type: 'daily_tasks', threshold: 5 }
    },
    {
      id: 6,
      code: 'PONTUAL',
      name: 'Pontual',
      description: 'Complete 10 tarefas dentro do prazo',
      icon: '⏰',
      condition: { type: 'on_time_tasks', threshold: 10 }
    },
    {
      id: 7,
      code: 'LIDER_MES',
      name: 'Líder do Mês',
      description: 'Seja o mais produtivo do mês',
      icon: '👨‍💼',
      condition: { type: 'monthly_leader', threshold: 1 }
    },
    {
      id: 8,
      code: 'COLABORATIVO',
      name: 'Colaborativo',
      description: 'Adicione 20 comentários em tarefas',
      icon: '🤝',
      condition: { type: 'comments_added', threshold: 20 }
    },
    {
      id: 9,
      code: 'INOVADOR',
      name: 'Inovador',
      description: 'Complete 5 tarefas complexas',
      icon: '💡',
      condition: { type: 'complex_tasks', threshold: 5 }
    }
  ];
  res.json(badges);
});

app.get('/api/gamification/user-badges/:userId', (req, res) => {
  const { userId } = req.params;
  
  // Simular badges conquistadas baseado no usuário
  const userBadges = [
    { userId: 1, badgeId: 1, earnedAt: '2025-09-01T10:00:00Z' },
    { userId: 1, badgeId: 2, earnedAt: '2025-09-10T15:30:00Z' },
    { userId: 1, badgeId: 3, earnedAt: '2025-09-15T09:45:00Z' },
    { userId: 1, badgeId: 5, earnedAt: '2025-09-16T08:30:00Z' }, // Workaholic
    { userId: 1, badgeId: 6, earnedAt: '2025-09-16T12:00:00Z' }, // Pontual
    { userId: 2, badgeId: 1, earnedAt: '2025-09-05T14:20:00Z' },
    { userId: 2, badgeId: 9, earnedAt: '2025-09-15T16:30:00Z' }, // Inovador
    { userId: 3, badgeId: 1, earnedAt: '2025-09-12T11:15:00Z' },
    { userId: 4, badgeId: 1, earnedAt: '2025-09-08T16:00:00Z' },
    { userId: 4, badgeId: 2, earnedAt: '2025-09-14T13:30:00Z' },
    { userId: 4, badgeId: 7, earnedAt: '2025-09-16T09:00:00Z' } // Líder do Mês
  ];
  
  const filteredBadges = userBadges.filter(ub => ub.userId === parseInt(userId));
  res.json(filteredBadges);
});

// Endpoint para buscar badge específico
app.get('/api/gamification/badge/:code', (req, res) => {
  const { code } = req.params;
  
  const badges = [
    { id: 1, code: 'INICIANTE', name: 'Iniciante', description: 'Complete sua primeira tarefa', icon: '🌟', condition: { type: 'tasks_completed', threshold: 1 } },
    { id: 2, code: 'PRODUTIVO_10', name: 'Produtivo', description: 'Complete 10 tarefas', icon: '⚡', condition: { type: 'tasks_completed', threshold: 10 } },
    { id: 3, code: 'ESPECIALISTA_100P', name: 'Especialista', description: 'Acumule 100 pontos', icon: '🏆', condition: { type: 'points_total', threshold: 100 } },
    { id: 4, code: 'MESTRE_50_TAREFAS', name: 'Mestre das Tarefas', description: 'Complete 50 tarefas', icon: '👑', condition: { type: 'tasks_completed', threshold: 50 } },
    { id: 5, code: 'WORKAHOLIC', name: 'Workaholic', description: 'Complete 5+ tarefas em um dia', icon: '🔥', condition: { type: 'daily_tasks', threshold: 5 } },
    { id: 6, code: 'PONTUAL', name: 'Pontual', description: 'Complete 10 tarefas dentro do prazo', icon: '⏰', condition: { type: 'on_time_tasks', threshold: 10 } },
    { id: 7, code: 'LIDER_MES', name: 'Líder do Mês', description: 'Seja o mais produtivo do mês', icon: '👨‍💼', condition: { type: 'monthly_leader', threshold: 1 } },
    { id: 8, code: 'COLABORATIVO', name: 'Colaborativo', description: 'Adicione 20 comentários em tarefas', icon: '🤝', condition: { type: 'comments_added', threshold: 20 } },
    { id: 9, code: 'INOVADOR', name: 'Inovador', description: 'Complete 5 tarefas complexas', icon: '💡', condition: { type: 'complex_tasks', threshold: 5 } }
  ];
  
  const badge = badges.find(b => b.code === code);
  if (!badge) {
    return res.status(404).json({ error: 'Badge não encontrado' });
  }
  
  res.json(badge);
});

app.get('/api/gamification/leaderboard', (req, res) => {
  const leaderboard = [
    { id: 1, name: 'Admin User', pointsTotal: 120, tasksCompleted: 25, rank: 1 },
    { id: 4, name: 'Developer User', pointsTotal: 95, tasksCompleted: 20, rank: 2 },
    { id: 2, name: 'Manager User', pointsTotal: 85, tasksCompleted: 18, rank: 3 },
    { id: 3, name: 'Regular User', pointsTotal: 45, tasksCompleted: 12, rank: 4 }
  ];
  res.json(leaderboard);
});

app.post('/api/gamification/complete-task', (req, res) => {
  const { taskId, userId, complexity } = req.body;
  
  // Calcular pontos baseado na complexidade
  const points = {
    'SIMPLES': 1,
    'NORMAL': 2,
    'COMPLEXA': 4
  }[complexity] || 2;
  
  // Simular atualização de pontos e verificação de badges
  const response = {
    pointsEarned: points,
    newBadges: [], // Seria calculado baseado nas condições
    totalPoints: 0 // Seria calculado do banco
  };
  
  // Simular verificação de novas badges
  if (Math.random() > 0.7) { // 30% de chance de ganhar badge
    response.newBadges.push({
      id: 2,
      code: 'PRODUTIVO_10',
      name: 'Produtivo',
      description: 'Complete 10 tarefas',
      icon: '⚡'
    });
  }
  
  res.json(response);
});

// Endpoints de Relatórios e Analytics
app.get('/api/reports/dashboard-stats', (req, res) => {
  const stats = {
    totalTasks: 28,
    completedTasks: 15,
    inProgressTasks: 8,
    openTasks: 5,
    totalUsers: 4,
    totalPoints: 345,
    averagePointsPerUser: 86.25,
    completionRate: 53.6, // 15/28 * 100
    tasksByComplexity: {
      SIMPLES: 8,
      NORMAL: 12,
      COMPLEXA: 8
    },
    tasksByStage: {
      EM_ABERTO: 5,
      ANDAMENTO: 8,
      ANALISE: 0,
      CONCLUIDO: 15
    },
    monthlyProgress: [
      { month: 'Ago', completed: 12, created: 18 },
      { month: 'Set', completed: 15, created: 10 }
    ]
  };
  res.json(stats);
});

app.get('/api/reports/user-performance', (req, res) => {
  const { userId } = req.query;
  
  const userPerformance = [
    {
      id: 1,
      name: 'Admin User',
      tasksCompleted: 25,
      pointsTotal: 120,
      averageTaskTime: '2.3 dias',
      efficiency: 92,
      complexTasksRatio: 40 // % de tarefas complexas
    },
    {
      id: 2,
      name: 'Manager User',
      tasksCompleted: 18,
      pointsTotal: 85,
      averageTaskTime: '3.1 dias',
      efficiency: 78,
      complexTasksRatio: 28
    },
    {
      id: 3,
      name: 'Regular User',
      tasksCompleted: 12,
      pointsTotal: 45,
      averageTaskTime: '4.2 dias',
      efficiency: 65,
      complexTasksRatio: 15
    },
    {
      id: 4,
      name: 'Developer User',
      tasksCompleted: 20,
      pointsTotal: 95,
      averageTaskTime: '2.8 dias',
      efficiency: 85,
      complexTasksRatio: 35
    }
  ];
  
  if (userId) {
    const userStats = userPerformance.find(u => u.id === parseInt(userId));
    res.json(userStats || {});
  } else {
    res.json(userPerformance);
  }
});

app.get('/api/reports/time-tracking', (req, res) => {
  const timeData = {
    dailyActivity: [
      { day: 'Seg', tasksCompleted: 3, timeSpent: 6.5 },
      { day: 'Ter', tasksCompleted: 4, timeSpent: 7.2 },
      { day: 'Qua', tasksCompleted: 2, timeSpent: 4.8 },
      { day: 'Qui', tasksCompleted: 5, timeSpent: 8.1 },
      { day: 'Sex', tasksCompleted: 3, timeSpent: 6.0 },
      { day: 'Sáb', tasksCompleted: 1, timeSpent: 2.5 },
      { day: 'Dom', tasksCompleted: 0, timeSpent: 0 }
    ],
    averageTimeByComplexity: {
      SIMPLES: 1.2, // dias
      NORMAL: 2.8,
      COMPLEXA: 5.6
    },
    bottlenecks: [
      { stage: 'ANALISE', averageTime: 3.2, taskCount: 5 },
      { stage: 'ANDAMENTO', averageTime: 4.1, taskCount: 8 }
    ]
  };
  res.json(timeData);
});

// Endpoints de Metas Mensais
app.get('/api/goals/monthly/:userId', (req, res) => {
  const { userId } = req.params;
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  // Dados de pontos e tarefas por usuário
  const userPoints = {1: 35, 2: 42, 3: 18, 4: 38};
  const userTasks = {1: 12, 2: 14, 3: 7, 4: 11};
  
  // Simular metas mensais
  const monthlyGoal = {
    id: 1,
    userId: parseInt(userId),
    year: currentYear,
    month: currentMonth,
    targetPoints: 50,
    currentPoints: userPoints[parseInt(userId)] || 25,
    targetTasks: 15,
    currentTasks: userTasks[parseInt(userId)] || 8,
    status: 'in_progress',
    createdAt: `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01T00:00:00Z`
  };
  
  res.json(monthlyGoal);
});

app.post('/api/goals/monthly', (req, res) => {
  const { userId, targetPoints, targetTasks } = req.body;
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  const newGoal = {
    id: Date.now(),
    userId: parseInt(userId),
    year: currentYear,
    month: currentMonth,
    targetPoints,
    targetTasks,
    currentPoints: 0,
    currentTasks: 0,
    status: 'active',
    createdAt: new Date().toISOString()
  };
  
  res.status(201).json(newGoal);
});

app.get('/api/goals/team-goals', (req, res) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  const teamGoals = {
    id: 1,
    name: 'Meta de Setembro',
    year: currentYear,
    month: currentMonth,
    targetPoints: 200,
    currentPoints: 133, // Soma dos pontos de todos
    targetTasks: 60,
    currentTasks: 44,
    progress: 66.5, // (133/200) * 100
    members: [
      { userId: 1, name: 'Admin User', contributedPoints: 35, contributedTasks: 12 },
      { userId: 2, name: 'Manager User', contributedPoints: 42, contributedTasks: 14 },
      { userId: 3, name: 'Regular User', contributedPoints: 18, contributedTasks: 7 },
      { userId: 4, name: 'Developer User', contributedPoints: 38, contributedTasks: 11 }
    ],
    status: 'active'
  };
  
  res.json(teamGoals);
});

// Catch all handler: send back React's index.html file for client-side routing
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'frontend', 'public', 'index.html');
  console.log('Serving index.html from:', indexPath);
  res.sendFile(indexPath);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Frontend available at: http://localhost:${PORT}`);
});