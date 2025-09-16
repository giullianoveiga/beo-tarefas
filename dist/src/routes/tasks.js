"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const auth_1 = require("./auth");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
router.get('/', auth_1.authenticateToken, async (req, res) => {
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
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao buscar tarefas' });
    }
});
router.get('/:id', auth_1.authenticateToken, async (req, res) => {
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
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao buscar tarefa' });
    }
});
router.post('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const { title, description, complexity, priority, responsibleId } = req.body;
        const { userId } = req.user;
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
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao criar tarefa' });
    }
});
router.put('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, complexity, priority, responsibleId, stage } = req.body;
        const { userId } = req.user;
        const currentTask = await prisma.task.findUnique({
            where: { id }
        });
        if (!currentTask) {
            return res.status(404).json({ error: 'Tarefa não encontrada' });
        }
        if (stage && stage !== currentTask.stage) {
            await prisma.taskHistory.create({
                data: {
                    taskId: id,
                    fromStage: currentTask.stage,
                    toStage: stage,
                    changedById: userId
                }
            });
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
                await checkBadgeAchievements(currentTask.responsibleId || userId);
            }
        }
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
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar tarefa' });
    }
});
router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.task.delete({
            where: { id }
        });
        res.status(204).send();
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao deletar tarefa' });
    }
});
async function checkBadgeAchievements(userId) {
    try {
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
        if (!user)
            return;
        const tasksCompleted = user.tasksResponsible.length;
        const pointsTotal = user.pointsTotal;
        const existingBadgeCodes = user.badges.map(b => b.badge.code);
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
    }
    catch (error) {
        console.error('Erro ao verificar conquistas:', error);
    }
}
exports.default = router;
//# sourceMappingURL=tasks.js.map