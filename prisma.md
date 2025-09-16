// ========= Prisma =========
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ========= Enums =========
enum Role {
  ADMIN
  GESTOR
  COLABORADOR
}

enum Priority {
  BAIXA
  NORMAL
  ALTA
  URGENTE
}

enum Complexity {
  SIMPLES   // 1 ponto
  NORMAL    // 2 pontos
  COMPLEXA  // 4 pontos
}

enum Stage {
  EM_ABERTO
  ANDAMENTO
  ANALISE
  CONCLUIDO
}

// ========= Usuários & Autenticação (Azure AD / Teams) =========
// Compatível com fluxo tipo NextAuth, mas genérico.
model User {
  id              String            @id @default(cuid())
  email           String            @unique
  name            String?
  image           String?
  role            Role              @default(COLABORADOR)
  // Auth
  accounts        Account[]
  sessions        Session[]         // Opcional (se for usar sessões estilo NextAuth)
  // App
  tasksResponsible Task[]           @relation("TaskResponsible")
  tasksCreated     Task[]           @relation("TaskCreator")
  badges          UserBadge[]
  goals           UserMonthlyGoal[]
  pointsTotal     Int               @default(0) // opcional (campo denormalizado)

  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
}

model Account {
  id                 String  @id @default(cuid())
  userId             String
  type               String  // "oauth" | "credentials"
  provider           String  // "azure-ad" | "credentials"
  providerAccountId  String
  refresh_token      String?
  access_token       String?
  expires_at         Int?
  id_token           String?
  token_type         String?
  scope              String?
  session_state      String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@index([userId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

// ========= Tarefas / Kanban =========
model Task {
  id            String      @id @default(cuid())
  title         String
  description   String
  responsibleId String?
  creatorId     String?
  complexity    Complexity
  priority      Priority
  stage         Stage       @default(EM_ABERTO)
  points        Int         @default(0) // definir com base em complexity: 1|2|4
  order         Int         @default(0) // ordenação dentro da coluna

  responsible   User?       @relation("TaskResponsible", fields: [responsibleId], references: [id], onDelete: SetNull)
  creator       User?       @relation("TaskCreator", fields: [creatorId], references: [id], onDelete: SetNull)

  concludedAt   DateTime?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  histories     TaskHistory[]

  @@index([stage, order])
  @@index([responsibleId])
  @@index([creatorId])
  @@index([stage])
}

model TaskHistory {
  id          String   @id @default(cuid())
  taskId      String
  fromStage   Stage?
  toStage     Stage
  changedById String?
  changedBy   User?     @relation(fields: [changedById], references: [id], onDelete: SetNull)
  createdAt   DateTime  @default(now())

  task Task @relation(fields: [taskId], references: [id], onDelete: Cascade)

  @@index([taskId, createdAt])
}

// ========= Gamificação (Badges & Ranking) =========
model Badge {
  id          String   @id @default(cuid())
  code        String   @unique // ex.: "INICIANTE", "PRODUTIVO_10", "INCANSAVEL_30", "ESPECIALISTA_100P", "WORKAHOLIC_10SEM", "PONTUAL_MES", "LIDER_MES"
  name        String
  description String?
  iconUrl     String?
  isActive    Boolean  @default(true)
  // Critérios opcionais (para motor de regras no backend)
  criteria    Json?

  users     UserBadge[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model UserBadge {
  id          String   @id @default(cuid())
  userId      String
  badgeId     String
  awardedAt   DateTime @default(now())
  // Contexto opcional da conquista:
  taskId      String?
  periodYear  Int?     // para conquistas mensais (ex.: "Líder do Mês")
  periodMonth Int?

  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  badge Badge @relation(fields: [badgeId], references: [id], onDelete: Cascade)
  task  Task? @relation(fields: [taskId], references: [id], onDelete: SetNull)

  @@unique([userId, badgeId, periodYear, periodMonth])
  @@index([userId])
  @@index([badgeId])
}

// ========= Metas & Relatórios =========
model UserMonthlyGoal {
  id           String  @id @default(cuid())
  userId       String
  year         Int
  month        Int      // 1..12
  targetPoints Int      // meta de pontos do usuário no mês

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, year, month])
  @@index([year, month])
}
