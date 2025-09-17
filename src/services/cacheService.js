const Redis = require('ioredis');

// Configuração do Redis
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true, // Conecta apenas quando necessário
});

// Eventos do Redis
redis.on('connect', () => {
  console.log('✅ Conectado ao Redis');
});

redis.on('error', (err) => {
  console.error('❌ Erro no Redis:', err.message);
});

redis.on('ready', () => {
  console.log('🚀 Redis pronto para uso');
});

class CacheService {
  constructor() {
    this.defaultTTL = 300; // 5 minutos
    this.prefix = 'beo-tarefas:';
  }

  // Chaves de cache
  getKey(type, ...params) {
    return `${this.prefix}${type}:${params.join(':')}`;
  }

  // Cache genérico
  async get(key) {
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Erro ao buscar do cache:', error);
      return null;
    }
  }

  async set(key, data, ttl = this.defaultTTL) {
    try {
      await redis.setex(key, ttl, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Erro ao salvar no cache:', error);
      return false;
    }
  }

  async del(key) {
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      console.error('Erro ao deletar do cache:', error);
      return false;
    }
  }

  async delPattern(pattern) {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      return keys.length;
    } catch (error) {
      console.error('Erro ao deletar padrão do cache:', error);
      return 0;
    }
  }

  // Cache específico para tarefas
  async getTasks(userId = null, stage = null) {
    const key = this.getKey('tasks', userId || 'all', stage || 'all');
    return await this.get(key);
  }

  async setTasks(tasks, userId = null, stage = null, ttl = this.defaultTTL) {
    const key = this.getKey('tasks', userId || 'all', stage || 'all');
    return await this.set(key, tasks, ttl);
  }

  async invalidateTasks(userId = null) {
    const pattern = this.getKey('tasks', userId || '*', '*');
    return await this.delPattern(pattern);
  }

  // Cache para usuários
  async getUsers() {
    const key = this.getKey('users', 'all');
    return await this.get(key);
  }

  async setUsers(users, ttl = this.defaultTTL) {
    const key = this.getKey('users', 'all');
    return await this.set(key, users, ttl);
  }

  async invalidateUsers() {
    const pattern = this.getKey('users', '*');
    return await this.delPattern(pattern);
  }

  // Cache para badges do usuário
  async getUserBadges(userId) {
    const key = this.getKey('user-badges', userId);
    return await this.get(key);
  }

  async setUserBadges(userId, badges, ttl = this.defaultTTL) {
    const key = this.getKey('user-badges', userId);
    return await this.set(key, badges, ttl);
  }

  async invalidateUserBadges(userId) {
    const pattern = this.getKey('user-badges', userId);
    return await this.delPattern(pattern);
  }

  // Cache para estatísticas
  async getStats(type, period = 'month') {
    const key = this.getKey('stats', type, period);
    return await this.get(key);
  }

  async setStats(type, stats, period = 'month', ttl = this.defaultTTL) {
    const key = this.getKey('stats', type, period);
    return await this.set(key, stats, ttl);
  }

  async invalidateStats(type = null) {
    const pattern = type
      ? this.getKey('stats', type, '*')
      : this.getKey('stats', '*', '*');
    return await this.delPattern(pattern);
  }

  // Cache para dashboard
  async getDashboard(userId = null) {
    const key = this.getKey('dashboard', userId || 'global');
    return await this.get(key);
  }

  async setDashboard(dashboard, userId = null, ttl = this.defaultTTL) {
    const key = this.getKey('dashboard', userId || 'global');
    return await this.set(key, dashboard, ttl);
  }

  async invalidateDashboard(userId = null) {
    const pattern = this.getKey('dashboard', userId || '*');
    return await this.delPattern(pattern);
  }

  // Método para limpar todo o cache
  async clearAll() {
    try {
      await redis.flushall();
      console.log('🧹 Cache Redis limpo completamente');
      return true;
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
      return false;
    }
  }

  // Método para obter informações do cache
  async getInfo() {
    try {
      const info = await redis.info();
      const keys = await redis.keys(`${this.prefix}*`);
      return {
        connected: redis.status === 'ready',
        totalKeys: keys.length,
        info: info.split('\r\n').filter(line => line.includes(':'))
      };
    } catch (error) {
      console.error('Erro ao obter informações do cache:', error);
      return { connected: false, error: error.message };
    }
  }

  // Método para fechar conexão
  async disconnect() {
    try {
      await redis.quit();
      console.log('👋 Desconectado do Redis');
    } catch (error) {
      console.error('Erro ao desconectar do Redis:', error);
    }
  }
}

// Exportar instância singleton
const cacheService = new CacheService();

module.exports = cacheService;