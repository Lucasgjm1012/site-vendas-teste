# Lume — Briefing de Implementação

> Plataforma corporativa para envio e gestão de propostas comerciais.
> Documento técnico para implementação. Siga as especificações com precisão — desvios devem ser justificados.

---

## 1. Contexto do Produto

**Lume** é uma plataforma corporativa para profissionais e consultores enviarem propostas comerciais e gerenciarem todo o ciclo: rascunho → envio → validação → orçamento aprovado → execução → arquivamento.

A plataforma resolve quatro dores principais:

1. Envio de propostas formais a clientes com identidade visual consistente.
2. Acompanhamento do status de cada proposta em tempo real.
3. Visão consolidada do orçamento de propostas aceitas.
4. Identificação rápida de propostas pendentes de validação ou vencidas.

**Público-alvo:** consultores, escritórios de advocacia, agências, profissionais autônomos sêniores e pequenas empresas B2B. Usuários sofisticados que valorizam ferramentas discretas e precisas — **não** o público de SaaS de consumo.

**Princípio central da experiência:** *quieto, preciso, definitivo.* Cada elemento da interface justifica sua presença. Espaço em branco é tratado como recurso, não como vazio. A plataforma deve transmitir **confiança silenciosa**.

---

## 2. Stack Técnico Sugerido

- **Framework:** Next.js 14+ (App Router) com TypeScript
- **Estilização:** Tailwind CSS com configuração customizada (tokens definidos abaixo)
- **Componentes base:** shadcn/ui como ponto de partida, customizando todos os tokens
- **Ícones:** Lucide Icons (`lucide-react`) — stroke 1.5px, nunca outro ícone-set misturado
- **Fontes:** carregadas via `next/font`
- **Tabelas:** TanStack Table para listagens
- **Gráficos:** Recharts com paleta restrita (definida abaixo)
- **Formulários:** React Hook Form + Zod
- **Animações:** Framer Motion com restrição (apenas funcionais, 200–300ms)

---

## 3. Identidade Visual

### 3.1 Paleta de cores

Definir como CSS variables no `globals.css` e expor como tokens no Tailwind.

**Cores primárias (verde-petróleo):**

```css
--color-primary: #0F3D3E;        /* Verde Petróleo — botões primários, headers, valores em destaque */
--color-primary-dark: #082726;   /* Hover states, sidebar ativa, modo escuro */
--color-accent: #4A7C74;         /* Verde Sálvia — links, ícones secundários, badges informativos */
```

**Neutros (representam ~80% da tela):**

```css
--color-bg: #FAFAF7;             /* Off-white — background principal. NUNCA usar branco puro */
--color-surface: #F1F1ED;        /* Cinza Névoa — cards secundários, inputs, hover de linhas */
--color-border: #E4E4DF;         /* Cinza Borda — divisórias e bordas de inputs */
--color-text-secondary: #6B6B66; /* Labels, metadados, timestamps */
--color-text: #1C1C1A;           /* Grafite — texto principal. NUNCA usar #000 puro */
--color-card: #FFFFFF;           /* Cards principais (único lugar que branco puro aparece) */
```

**Cores de status (uso restrito — apenas sinalização, nunca grandes blocos):**

```css
--color-success: #2D6A4F;        /* Aprovada, recebida */
--color-warning: #B08900;        /* Pendente, em revisão */
--color-danger: #9B2C2C;         /* Recusada, vencida */
--color-neutral-status: #6B6B66; /* Rascunho */
```

**Regra inegociável:** cores de status nunca preenchem grandes áreas. Aparecem apenas como pontos de 8px, bordas finas (1–2px) ou cor de texto. O resto da interface permanece em neutros + verde primário.

### 3.2 Tipografia

Carregar três famílias via `next/font/google`:

- **Inter Tight** — títulos e logo (pesos 400, 500, 600)
- **Inter** — corpo e interface (pesos 400, 500)
- **JetBrains Mono** — dados numéricos, valores monetários, datas (peso 400)

**Escala tipográfica (tamanho / line-height / peso / letter-spacing):**

```
display      32px / 40px / 500 / -1%      Inter Tight
h1           24px / 32px / 500 / -0.5%    Inter Tight
h2           18px / 26px / 500 /  0%      Inter Tight
body         14px / 22px / 400 /  0%      Inter
body-small   13px / 20px / 400 /  0%      Inter
caption      12px / 16px / 500 / +2%      Inter (uppercase opcional)
mono         14px / 22px / 400 /  0%      JetBrains Mono
```

**Regras tipográficas:**

- **Nunca usar peso bold (700+)** — quebra o tom sussurrado da marca. Máximo é Semibold (600), apenas em raros casos.
- Captions em uppercase **sempre** com `letter-spacing: 0.02em`. Sem isso parecem agressivas.
- Valores monetários: **sempre** em JetBrains Mono, alinhados à direita, com separador de milhar no padrão BR (`R$ 12.450,00`). Nunca `R$12450` ou `R$ 12,450.00`.
- Texto longo: **nunca** centralizado. Alinhamento à esquerda sempre.

### 3.3 Logo

A logo já existe e será fornecida. Especificações de uso:

- Altura mínima: **16px** em digital.
- Respiro mínimo equivalente à altura da letra "x" do logotipo em todos os lados.
- Posicionada no topo da sidebar, alinhada com o padding interno da sidebar (24px da esquerda).

---

## 4. Sistema de Layout

### 4.1 Estrutura geral (desktop)

```
┌─────────────┬──────────────────────────────────────────────┐
│             │  Topbar 56px                                 │
│  Sidebar    ├──────────────────────────────────────────────┤
│  240px      │                                              │
│  fixa       │  Conteúdo principal                          │
│             │  padding: 32px                               │
│  bg:        │  max-width: 1280px                           │
│  #FAFAF7    │  centralizado                                │
│             │                                              │
│  separada   │                                              │
│  por 1px    │                                              │
│  #E4E4DF    │                                              │
└─────────────┴──────────────────────────────────────────────┘
```

**Sidebar (240px, fundo `#FAFAF7`):**
- Logo no topo (24px de padding superior e lateral)
- Navegação principal: Dashboard, Propostas, Clientes, Orçamentos, Relatórios
- Item ativo: fundo `#F1F1ED`, texto em `--color-primary-dark`, sem borda lateral colorida (fica brega)
- Rodapé: avatar do usuário + ícone de configurações

**Topbar (56px, fundo `--color-bg`, borda inferior 1px `--color-border`):**
- Esquerda: breadcrumb (caption + chevron + página atual)
- Centro: campo de busca global (max 480px)
- Direita: botão primário contextual (ex: "Nova proposta")

**Conteúdo:**
- Padding interno: 32px
- Max-width: 1280px, centralizado
- Grid de 12 colunas, gutter 24px

### 4.2 Sistema de espaçamento

**Use exclusivamente múltiplos de 4:**

```
4 / 8 / 12 / 16 / 24 / 32 / 48 / 64
```

Nunca use 10px, 15px, 18px, 20px, 30px. Isso é o que separa interfaces amadoras das profissionais.

### 4.3 Cards

```css
background: #FFFFFF;
border: 1px solid #E4E4DF;
border-radius: 6px;
box-shadow: none; /* CRÍTICO: sem sombra. Sombras parecem datadas em interfaces premium minimalistas */
padding: 24px;
```

Border-radius **nunca** maior que 8px. 12px+ dá ar de app de consumidor.

### 4.4 Tabelas

- **Sem zebra striping** (alternância de cor de linha).
- Apenas linha divisória inferior de 1px `--color-border` entre rows.
- Hover de linha: background `#F1F1ED`.
- Header da tabela: caption (uppercase, 12px, `--color-text-secondary`).
- Densidade: padding vertical de 12px por linha. Não comprimir mais que isso.

### 4.5 Botões

**Primário:**
```css
background: #0F3D3E;
color: #FAFAF7;
padding: 10px 20px;
border-radius: 6px;
font-weight: 500;
font-size: 14px;
transition: background 200ms;

&:hover { background: #082726; }
```

**Secundário:**
```css
background: transparent;
color: #1C1C1A;
border: 1px solid #1C1C1A;
padding: 10px 20px; /* mesmo do primário para alinhar */
border-radius: 6px;

&:hover { background: #F1F1ED; }
```

**Terciário (text button):**
```css
background: none;
color: #0F3D3E;
padding: 0;

&:hover { text-decoration: underline; }
```

### 4.6 Inputs

```css
background: #FFFFFF;
border: 1px solid #E4E4DF;
border-radius: 6px;
padding: 10px 14px;
font-size: 14px;

&:focus {
  border-color: #0F3D3E;
  outline: 2px solid rgba(15, 61, 62, 0.1);
  outline-offset: 0;
}
```

Labels acima do input em caption (uppercase, 12px). Mensagens de erro abaixo, em `--color-danger`, 13px.

---

## 5. Iconografia

- **Biblioteca única:** Lucide Icons (`lucide-react`).
- **Stroke-width:** 1.5px (não usar o default 2px — pesado demais).
- **Tamanhos:** 16px (inline com texto) ou 20px (botões e ações).
- **Cor:** herdada do contexto, geralmente `--color-text-secondary`.
- **Nunca** misturar com outra biblioteca de ícones.
- **Nunca** usar ícones preenchidos ou coloridos.

---

## 6. Páginas a Implementar (MVP)

### 6.1 Dashboard (`/`)

Visão consolidada para o usuário ao entrar.

**Estrutura:**

1. **Saudação contextual** (h1): "Boa tarde, [Nome]." — sem emoji, sem exclamação.
2. **Quatro KPI cards** em grid de 4 colunas:
   - Propostas em aberto (count)
   - Aguardando validação (count)
   - Receita prevista (R$, em JetBrains Mono)
   - Receita do mês (R$, em JetBrains Mono)
   Cada card tem: caption em uppercase com o label, valor grande (display 32px), e variação vs período anterior em body-small (verde se positiva, vinho se negativa, com seta `lucide:arrow-up-right`).
3. **Gráfico de receita** (12 meses, line chart, Recharts):
   - Linha principal em `--color-primary` (`#0F3D3E`).
   - Linha secundária (período anterior) em `--color-accent` (`#4A7C74`), tracejada.
   - Eixos em `--color-text-secondary`. Grid em `--color-border`, tracejado fino.
   - Sem 3D, sem gradientes, sem área preenchida sob a linha.
4. **Lista de propostas recentes** (últimas 5), com mesmo estilo da página de Propostas.

### 6.2 Propostas (`/propostas`)

Lista completa com filtros.

**Filtros (topo):** chips clicáveis para status (Todas, Rascunho, Enviadas, Em validação, Aceitas, Recusadas, Vencidas). Chip ativo: fundo `--color-primary`, texto branco. Inativo: borda 1px `--color-border`.

**Tabela:** colunas — Status (ponto + label), Cliente, Título da proposta, Valor (mono, alinhado à direita), Enviada em (data), Ações (ícone de menu `lucide:more-horizontal`).

**Indicação de status (em todas as listas):**

```
●  Rascunho          cor: #6B6B66
●  Enviada           cor: #4A7C74
●  Em validação      cor: #B08900
●  Aceita            cor: #2D6A4F
●  Recusada          cor: #9B2C2C
●  Vencida           cor: #9B2C2C  + valor com text-decoration: line-through
```

Ponto: círculo de 8px à esquerda do label. Label em caption uppercase, mesma cor do ponto com 80% opacity.

### 6.3 Detalhe da proposta (`/propostas/[id]`)

**Header:** título em h1, status visual, valor total em display 32px (JetBrains Mono).

**Seções (cards separados):**
- Informações do cliente
- Escopo da proposta (rich text)
- Itens e valores (tabela com descrição, quantidade, valor unitário, subtotal — todos em mono à direita)
- Timeline de eventos (criada → enviada → visualizada → respondida) — lista vertical com pontos conectados por linha vertical de 1px `--color-border`
- Anexos

**Ações no topo direito:** Editar, Duplicar, Arquivar, Enviar (botão primário).

### 6.4 Nova proposta (`/propostas/nova`)

Formulário em etapas (stepper horizontal no topo, sem números — apenas títulos com underline na etapa ativa):

1. Cliente
2. Escopo
3. Itens e valores
4. Revisão e envio

Inputs largos, generosos. Botões "Voltar" (secundário) e "Avançar" (primário) fixos no rodapé.

### 6.5 Orçamentos (`/orcamentos`)

Visão consolidada de propostas aceitas.

- KPI: Total contratado, Total recebido, A receber.
- Tabela: Cliente, Proposta, Valor total, Recebido, A receber, Status do pagamento.
- Gráfico de waterfall opcional (apenas se simples — não forçar).

### 6.6 Clientes (`/clientes`)

Lista simples: nome, email, propostas enviadas (count), valor total contratado (mono).

---

## 7. Linguagem e Tom de Voz

### 7.1 Princípios

- **Direto, não seco.** "Proposta enviada para Roberto Lima." — não "Sua proposta foi enviada com sucesso! 🎉".
- **Humano, não casual.** Evitar "Opa!", emojis, exclamações duplas. Mas também evitar robotice tipo "Operação concluída".
- **Confiante, não agressivo.** "Aguardando resposta do cliente há 7 dias" comunica mais que "Atenção: cliente atrasado!".
- **Específico, não genérico.** "Revisar valor da proposta #142" é melhor que "Você tem pendências".

### 7.2 Vocabulário

| Use | Evite |
|---|---|
| Proposta, orçamento, escopo | Quote, deal, oferta |
| Em elaboração, enviada, aceita, recusada | Pending, success, failed |
| Cliente, contraparte | Lead, prospect |
| Valor, honorários | Preço, custo |
| Prazo de validade | Expira em |

### 7.3 Microcopy (textos de interface)

- **Estado vazio:** "Nenhuma proposta enviada ainda. Comece criando a primeira."
- **Confirmação:** "Proposta arquivada." (não "com sucesso!")
- **Erro:** "Não foi possível salvar. Verifique sua conexão." (nunca "Erro 500" ou "Algo deu errado")
- **CTAs:** verbos curtos no infinitivo — "Enviar proposta", "Duplicar", "Arquivar", "Aprovar".
- **Saudação:** "Boa tarde, [Nome]." — com ponto final, sem exclamação.
- **Sem emojis em qualquer ponto da interface.**

---

## 8. Animações e Motion

**Restrição é a regra.** Animações são funcionais, nunca decorativas.

- **Duração padrão:** 200ms para hover/click, 300ms para transições de página.
- **Easing:** `cubic-bezier(0.4, 0, 0.2, 1)` (ease-out suave).
- **Permitido:** fade-in de gráficos no carregamento (300ms), hover states em botões e linhas, transição suave de modais (slide + fade).
- **Proibido:** parallax, scroll-triggered animations decorativas, bounces, springs exagerados, partículas, qualquer animação acima de 400ms, animações em loop.

---

## 9. Princípios Inegociáveis

Validar cada decisão de design contra estes pontos:

1. **No máximo duas cores por tela** além dos neutros.
2. **Nunca centralizar texto longo** — alinhamento à esquerda sempre.
3. **Densidade alta com respiro** — listas mostram informação útil sem agrupar tudo num bloco.
4. **Animações são funcionais** — apenas para feedback (200–300ms), nunca decorativas.
5. **Valores monetários sempre em monoespaçada**, alinhados à direita em colunas, formato BR.
6. **Sem sombras em cards.** Apenas borda 1px.
7. **Sem branco puro (`#FFF`)** como background da página. Apenas dentro de cards.
8. **Sem preto puro (`#000`)** em texto. Usar `#1C1C1A`.
9. **Sem emojis** em qualquer parte da interface.
10. **Sem peso bold (700+).** Máximo Semibold (600), e raramente.

---

## 10. Configuração Inicial Sugerida

**Estrutura de pastas:**

```
/app
  /(dashboard)
    /page.tsx              # Dashboard
    /propostas
      /page.tsx            # Lista
      /[id]/page.tsx       # Detalhe
      /nova/page.tsx       # Formulário
    /orcamentos/page.tsx
    /clientes/page.tsx
  /layout.tsx              # Sidebar + topbar
  /globals.css             # CSS variables + base styles
/components
  /ui                      # shadcn customizado
  /layout                  # Sidebar, Topbar
  /propostas               # PropostaCard, StatusDot, etc.
  /charts                  # RevenueChart, etc.
/lib
  /utils.ts
  /format.ts               # formatBRL, formatDate
/types
```

**`tailwind.config.ts` — extensão de cores:**

```ts
theme: {
  extend: {
    colors: {
      primary: { DEFAULT: '#0F3D3E', dark: '#082726' },
      accent: '#4A7C74',
      bg: '#FAFAF7',
      surface: '#F1F1ED',
      border: '#E4E4DF',
      text: { DEFAULT: '#1C1C1A', secondary: '#6B6B66' },
      success: '#2D6A4F',
      warning: '#B08900',
      danger: '#9B2C2C',
    },
    fontFamily: {
      display: ['var(--font-inter-tight)'],
      sans: ['var(--font-inter)'],
      mono: ['var(--font-jetbrains-mono)'],
    },
    borderRadius: {
      DEFAULT: '6px',
    },
  },
}
```

---

## 11. Critérios de Aceite

A implementação está correta quando:

- Toda cor utilizada vem das variáveis CSS definidas. Nenhum hex hardcoded em componentes.
- Todo espaçamento é múltiplo de 4.
- Valores monetários usam `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })` e estão em fonte mono.
- Datas usam formato BR (`dd/mm/aaaa` ou relativo: "há 3 dias").
- Nenhum card tem `box-shadow`.
- Nenhuma fonte além das três especificadas é carregada.
- Hover states existem em todos elementos interativos.
- Estados vazios e de erro seguem o vocabulário do item 7.
- Nenhum emoji aparece na UI.

---

**Fim do briefing.** Em caso de dúvida sobre componente não especificado, seguir os princípios da seção 9 e o tom geral da seção 1.
