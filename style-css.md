# Neumorphism (Soft‑UI) — Implementation Guide

> Pronto para usar em qualquer projeto (CSS puro ou Tailwind).

## 1) O que é Neumorphism?
Neumorphism (ou *Soft‑UI*) é um estilo que combina minimalismo com sombras suaves para criar a sensação de elementos **extrudados** (para fora) ou **inset** (pressionados) a partir do mesmo plano do fundo. O efeito é obtido com **duas sombras simultâneas** (clara e escura) e, opcionalmente, um **gradiente** muito sutil no fundo do componente.

Quando bem dosado, transmite maciez e modernidade. Quando mal dosado (contraste baixo demais), prejudica acessibilidade. Use com parcimônia em superfícies maiores e em controles discretos (cards, toggles), mantendo textos e ações primárias com contraste alto.

---

## 2) Design Tokens recomendados
Centralize variáveis para manter consistência e facilitar temas claro/escuro.

```css
:root {
  /* Cores base */
  --neu-bg: #e8edf3;            /* cor do plano de fundo */
  --neu-surface: var(--neu-bg); /* superfícies costumam ser a mesma cor */
  --neu-text: #2b2f33;          /* texto padrão */
  --neu-text-muted: #5e6a75;

  /* Luz e sombras */
  --neu-light: rgba(255, 255, 255, 0.9); /* highlight */
  --neu-dark:  rgba(14, 30, 49, 0.15);   /* sombra */

  /* Raio e espaçamento */
  --neu-radius: 14px;
  --neu-pad: 14px;

  /* Elevação e direção da luz (top‑left) */
  --neu-offset: 10px;     /* distância das sombras */
  --neu-blur: 20px;       /* suavidade */
  --neu-inset-depth: 6px; /* para estados pressionados/inset */
}
```

**Dica:** A regra de ouro é **fundo e elementos com a mesma cor base** (ou variações mínimas). Evite diferenças de luminosidade acima de 4–6% entre `--neu-bg` e `--neu-surface` para preservar a ilusão de extrusão.

---

## 3) Efeitos centrais (receitas CSS)

### 3.1. Superfície elevada (extruded)
```css
.neu {
  color: var(--neu-text);
  background: var(--neu-surface);
  border-radius: var(--neu-radius);
  padding: var(--neu-pad);
  box-shadow:
    /* sombra escura (bottom‑right) */
    var(--neu-offset) var(--neu-offset) var(--neu-blur) var(--neu-dark),
    /* luz (top‑left) */
    calc(var(--neu-offset) * -1) calc(var(--neu-offset) * -1) var(--neu-blur) var(--neu-light);
}
```

### 3.2. Superfície pressionada (inset)
```css
.neu-inset {
  background: var(--neu-surface);
  border-radius: var(--neu-radius);
  padding: var(--neu-pad);
  box-shadow:
    inset var(--neu-inset-depth) var(--neu-inset-depth) var(--neu-blur) var(--neu-dark),
    inset calc(var(--neu-inset-depth) * -1) calc(var(--neu-inset-depth) * -1) var(--neu-blur) var(--neu-light);
}
```

### 3.3. Estado ativo/“pressed” para botões
```css
.button.neu:active {
  box-shadow:
    inset var(--neu-inset-depth) var(--neu-inset-depth) var(--neu-blur) var(--neu-dark),
    inset calc(var(--neu-inset-depth) * -1) calc(var(--neu-inset-depth) * -1) var(--neu-blur) var(--neu-light);
  transform: translateY(1px);
}
```

### 3.4. Sombreamento direcional
Mude a “origem da luz” alternando os sinais dos offsets. Por exemplo, luz vinda do **top‑right**:
```css
/* top-right light source */
.neu-tr {
  box-shadow:
    /* dark bottom-left */
    calc(var(--neu-offset) * -1) var(--neu-offset) var(--neu-blur) var(--neu-dark),
    /* light top-right */
    var(--neu-offset) calc(var(--neu-offset) * -1) var(--neu-blur) var(--neu-light);
}
```

---

## 4) Versão com Tailwind (via utilitárias)
Você pode criar *utilities* personalizadas com `@layer utilities` ou usar classes prontas com valores próximos:

```html
<!-- Card elevado -->
<div class="rounded-2xl p-4 text-slate-800
            shadow-[10px_10px_20px_rgba(14,30,49,0.15),-10px_-10px_20px_rgba(255,255,255,0.9)]
            bg-[#e8edf3]">
  Conteúdo
</div>

<!-- Campo inset -->
<input class="rounded-2xl p-3 outline-none bg-[#e8edf3]
               shadow-[inset_6px_6px_20px_rgba(14,30,49,0.15),inset_-6px_-6px_20px_rgba(255,255,255,0.9)]" />
```

> Para manter consistência, crie *tokens* no Tailwind (cores, radii) e **plugins** para as sombras `neu` e `neu-inset`.

---

## 5) Componentes — receitas rápidas

### 5.1. Botão primário (com contraste)
```css
.button {
  --neu-surface: #2e6bff;    /* fundo “sólido” para contraste */
  --neu-light: rgba(255,255,255,0.35);
  --neu-dark: rgba(0,0,0,0.25);
  color: #fff;
  font-weight: 600;
}
.button.neu:hover { filter: brightness(1.04); }
.button.neu:disabled { opacity: .55; cursor: not-allowed; }
```

**Por quê?** Botões de ação **não** devem usar a mesma cor do fundo (risco de contraste insuficiente). Use cor sólida para *call‑to‑action* e mantenha o *soft shadow* como detalhe.

### 5.2. Cards informativos
- Use `.neu` com `padding` generoso.
- Conteúdo interno com **tipografia legível** (≥ 14–16px).
- Aplique **separadores sutis** com `border: 1px solid rgba(0,0,0,.04)` se precisar de hierarquia.

### 5.3. Inputs / Toggles / Sliders
- “Canais”/trilhos com `.neu-inset`.
- *Thumb*/botão deslizante com `.neu` e micro‑sombra adicional (`box-shadow: 0 1px 2px rgba(0,0,0,.08)`).
- Estados **focus** sempre com **outline visível** (`outline: 2px solid #2e6bff; outline-offset: 2px`).

---

## 6) Temas Claro e Escuro

```css
@media (prefers-color-scheme: dark) {
  :root {
    --neu-bg: #CED6E0;
    --neu-surface: #002c79;
    --neu-text: #e6ecf2;
    --neu-text-muted: #a9b4c0;
    --neu-light: rgba(255,255,255,0.06);
    --neu-dark: rgba(0,0,0,0.55);
    --neu-offset: 8px;
    --neu-blur: 16px;
  }
}
```

- Em **dark mode**, reduza `--neu-light` e **aumente** opacidade da sombra escura para preservar profundidade sem “brilho plástico”.
- Cheque contraste após qualquer ajuste de tema.

---

## 7) Acessibilidade (checklist prático)

1. **Contraste de texto**: cumprir **WCAG 2.1 AA** (padrão: 4.5:1). Use superfícies **contrastadas** para CTAs e textos.
2. **Indicadores de foco**: *outline* sempre visível e **não** removido.
3. **Estados** claramente distintos: `:hover`, `:active`, `:disabled`, `:aria-pressed="true"` / `data-state` etc.
4. **Tamanho mínimo alvo**: 44×44px para elementos tocáveis.
5. **Modo alto contraste**: valide em **Windows HC**, `prefers-contrast`, e ofereça **modo alternativo** (sombras menos importantes, bordas reais).
6. **Fallback sem sombras**: se `box-shadow` for removido (redução de movimento/contraste), **borda sólida** substitui a profundidade.

Exemplo de fallback automático:
```css
@media (prefers-contrast: more) {
  .neu, .neu-inset {
    box-shadow: none;
    border: 1px solid color-mix(in oklab, var(--neu-text) 12%, transparent);
  }
}
```

---

## 8) Performance e renderização
- Prefira **sombras moderadas** (blur ≤ 24–28px) e evite camadas múltiplas em listas longas.
- Para animações, anime **transform/opacity** — **não** anime sombras continuamente.
- Em *mobile*, considere **reduzir o blur** e **cachear** superfícies estáticas em *layers* (`will-change: transform` apenas durante animação).

---

## 9) Erros comuns (e como evitar)
- **Contraste insuficiente** para texto/ícones → use cores sólidas em ações e tipografia, mantendo o *soft‑UI* só em superfícies.
- **Sombras exageradas** (offset/blur altos) → visual “borrachudo”. Ajuste para algo sutil.
- **Direção de luz inconsistente** entre componentes → defina um eixo global (ex.: top‑left) e mantenha.
- **Abuso do estilo** em tabelas densas e formulários longos → prefira aplicar apenas em contêineres e controles principais.

---

## 10) Integração rápida (starter)
```html
<link rel="stylesheet" href="neu.css">
<!-- use .neu para elevados e .neu-inset para cavados -->
<div class="neu" style="max-width: 420px">
  <h3 style="margin:0 0 8px 0">Título</h3>
  <p class="text-muted">Conteúdo do card em estilo soft‑UI.</p>
  <button class="button neu">Ação</button>
</div>
```

> Copie os *tokens* deste guia para o seu projeto e padronize o uso via classes utilitárias.

---

## 11) Referências úteis
- Galeria de componentes prontos em **CSS/Tailwind** (neumorphism): Uiverse.  
- Gerador de sombras e presets: Neumorphism.io.  
- Conceitos, prós/contras e técnicas: CSS‑Tricks e LogRocket.  
- Acessibilidade: exemplos e discussões (Contrast, outlines, estados).

---

### Anexo: Mapa rápido de parâmetros
- `offset` (6–12px) → distancia a “elevação” percebida.
- `blur` (14–24px) → maciez do material.
- `dark alpha` (0.12–0.25) / `light alpha` (0.6–0.95 claro; 0.04–0.1 escuro).
- `radius` (12–20px) → aspecto “macio”.
- **Luz global**: top‑left (padrão).

> Ajuste sempre testando contraste e legibilidade após mudanças de paleta.
