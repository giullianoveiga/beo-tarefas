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
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
});
router.get('/:id', auth_1.authenticateToken, async (req, res) => {
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
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao buscar usuário' });
    }
});
router.put('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, role } = req.body;
        const { userId, role: userRole } = req.user;
        if (role && userRole !== 'ADMIN') {
            return res.status(403).json({ error: 'Apenas administradores podem alterar roles' });
        }
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
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar usuário' });
    }
});
router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, role } = req.user;
        if (role !== 'ADMIN' && userId !== id) {
            return res.status(403).json({ error: 'Acesso negado' });
        }
        await prisma.user.delete({
            where: { id }
        });
        res.status(204).send();
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao deletar usuário' });
    }
});
router.get('/ranking/top', auth_1.authenticateToken, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
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
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao buscar ranking' });
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map