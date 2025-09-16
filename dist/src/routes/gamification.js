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
router.get('/badges', auth_1.authenticateToken, async (req, res) => {
    try {
        const badges = await prisma.badge.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' }
        });
        res.json(badges);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao buscar badges' });
    }
});
router.get('/user/:userId/badges', auth_1.authenticateToken, async (req, res) => {
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
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao buscar badges do usuário' });
    }
});
router.get('/stats', auth_1.authenticateToken, async (req, res) => {
    try {
        const [totalUsers, totalTasks, totalPoints, totalBadges] = await Promise.all([
            prisma.user.count(),
            prisma.task.count({ where: { stage: 'CONCLUIDO' } }),
            prisma.user.aggregate({
                _sum: { pointsTotal: true }
            }),
            prisma.userBadge.count()
        ]);
        const complexityStats = await prisma.task.groupBy({
            by: ['complexity'],
            where: { stage: 'CONCLUIDO' },
            _count: true
        });
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
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
});
router.get('/goals/:userId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const { year, month } = req.query;
        const where = { userId };
        if (year && month) {
            where.year = parseInt(year);
            where.month = parseInt(month);
        }
        const goals = await prisma.userMonthlyGoal.findMany({
            where,
            orderBy: [
                { year: 'desc' },
                { month: 'desc' }
            ]
        });
        res.json(goals);
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao buscar metas' });
    }
});
router.post('/goals', auth_1.authenticateToken, async (req, res) => {
    try {
        const { userId, year, month, targetPoints } = req.body;
        const { userId: currentUserId, role } = req.user;
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
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao criar meta' });
    }
});
router.get('/progress/:userId/:year/:month', auth_1.authenticateToken, async (req, res) => {
    try {
        const { userId, year, month } = req.params;
        const goal = await prisma.userMonthlyGoal.findUnique({
            where: {
                userId_year_month: {
                    userId,
                    year: parseInt(year),
                    month: parseInt(month)
                }
            }
        });
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
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao buscar progresso' });
    }
});
exports.default = router;
//# sourceMappingURL=gamification.js.map