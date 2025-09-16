📑 PRD – Sistema Web de Gerenciamento de Tarefas com Gamificação
1. Visão Geral
Sistema web para gerenciamento de tarefas em Kanban, com pontuação por complexidade, relatórios de desempenho e gamificação (ranking e badges). A autenticação será integrada ao Microsoft Teams/Azure AD, permitindo login corporativo.
________________________________________
2. Usuários-Alvo
•	Gestores → acompanham desempenho, metas e aprovam relatórios.
•	Colaboradores → executam tarefas, participam do ranking e ganham badges.
•	Administradores → definem permissões (gestor/colaborador) e gerenciam usuários.
________________________________________
3. Funcionalidades Principais
3.1. Gestão de Tarefas
•	Criação/edição/exclusão de tarefas.
•	Campos: Título, Descrição, Responsável, Complexidade, Prioridade.
•	Fluxo Kanban: Em Aberto → Andamento → Análise → Concluído.
•	Pontuação por complexidade: Simples (1), Normal (2), Complexa (4).
•	Priorização: Baixa, Normal, Alta, Urgente.
________________________________________
3.2. Gamificação
•	Ranking: usuários ordenados por pontos acumulados.
•	Badges (conquistas):
o	Iniciante → primeira tarefa concluída.
o	Produtivo → 10 tarefas concluídas.
o	Incansável → 30 tarefas concluídas.
o	Especialista → 100 pontos acumulados.
o	Workaholic → 10 tarefas concluídas em 1 semana.
o	Pontual → todas as tarefas do mês concluídas no prazo.
o	Líder do Mês → mais pontos no ranking mensal.
•	Badges exibidos no perfil do usuário e ranking.
________________________________________
3.3. Relatórios e KPIs
•	Filtros por mês.
•	KPIs:
o	Meta individual de pontos vs pontos realizados.
o	Meta da equipe (soma das metas individuais).
o	Pontos realizados por usuário.
o	Pontos realizados pela equipe.
•	Gráficos comparativos (linha, barra, pizza).
•	Exportação em PDF e Excel.
________________________________________
4. Requisitos Funcionais
4.1. Autenticação e Usuários
•	Login via conta Microsoft Teams (Azure AD).
•	Usuários autenticados entram como Colaboradores por padrão.
•	Administradores podem promover usuários a Gestores ou mantê-los como Colaboradores.
•	Possibilidade de login alternativo (usuário/senha local) como fallback.
4.2. Perfis
•	Administrador → gerencia permissões, metas globais e relatórios.
•	Gestor → cria e atribui tarefas, acompanha resultados.
•	Colaborador → executa e movimenta tarefas.
4.3. Fluxo de Trabalho
1.	Colaborador loga com a conta do Teams.
2.	Admin atribui papel (Gestor ou mantém como Colaborador).
3.	Colaborador executa tarefas, acumula pontos e badges.
4.	Gestor acompanha relatórios e ranking.
________________________________________
5. Requisitos Não Funcionais
•	Tecnologias sugeridas:
o	Frontend: React + TailwindCSS
o	Backend: Node.js (NestJS) ou Python (FastAPI)
o	Banco: PostgreSQL
•	Autenticação: integração com Azure Active Directory (OAuth 2.0 / OpenID Connect).
•	Segurança:
o	Tokens JWT para sessões.
o	Controle de permissões por papel.
•	Escalabilidade: 100+ usuários simultâneos.
•	Responsividade: compatível com desktop e mobile.
________________________________________
6. KPIs de Sucesso
•	≥ 80% de logins realizados via Teams (adoção da integração).
•	≥ 90% das tarefas concluídas no prazo.
•	≥ 70% dos usuários conquistando ao menos 1 badge por mês.

