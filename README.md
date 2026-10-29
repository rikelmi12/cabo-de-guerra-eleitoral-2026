# 🗳️ Cabo de Guerra Eleitoral 2026 — Lula x Flávio Bolsonaro

Um jogo e simulador interativo de navegador com o mapa do Brasil estado por estado, trazendo dados eleitorais detalhados do **1º Turno**, **2º Turno** e uma **análise gráfica de ganhos e perdas (variação)** entre os turnos.

![Visual do Jogo](https://img.shields.io/badge/Status-Concluído-success)
![Linguagens](https://img.shields.io/badge/Tech-HTML5%20%7C%20CSS3%20%7C%20JavaScript-blue)
![Licença](https://img.shields.io/badge/License-MIT-green)
[![Jogue Online](https://img.shields.io/badge/Jogue%20Online-GitHub%20Pages-brightgreen)](https://rikelmi12.github.io/cabo-de-guerra-eleitoral-2026/)

> 🎮 **Link do Jogo Online (GitHub Pages):**  
> **[https://rikelmi12.github.io/cabo-de-guerra-eleitoral-2026/](https://rikelmi12.github.io/cabo-de-guerra-eleitoral-2026/)**

---

## ✨ Funcionalidades Principais

### 1. 🗺️ Mapa do Brasil Interativo (27 Unidades da Federação)
- **SVG Geográfico Otimizado**: Contornos fiéis de todos os 26 estados + Distrito Federal, desenhados via coordenadas simplificadas ultraleves (~75 KB).
- **Rótulos Inteligentes**: Posições ajustadas com linhas-guia para estados menores do litoral nordestino (SE, AL, PE, PB, RN) e Sudeste/Centro-Oeste (ES, RJ, DF).
- **Tooltip Completo ao Passar o Mouse**: Mostra o nome do estado, colégio eleitoral aproximado, percentuais e barras proporcionais para cada candidato.

### 2. 🔄 3 Modos de Visualização Oficial
- **1º Turno (04/10/2026)**:
  - Flávio Bolsonaro lidera nacionalmente com 47,03% (15 estados, incluindo São Paulo, Rio de Janeiro e Minas Gerais).
  - Lula obtém 45,16% (12 estados, incluindo todo o Nordeste, Pará e Amazonas).
  - Exibição dos votos de terceiros candidatos (~7,81%).
- **2º Turno (25/10/2026)**:
  - Lula é reeleito nacionalmente com 51,79% dos votos válidos (13 estados).
  - Destaque especial para **Minas Gerais**, o "fiel da balança" que virou de Flávio para Lula (50,40% x 49,60%).
  - Flávio Bolsonaro obtém 48,21% dos votos válidos (14 UFs).
- **Variação (1º ➔ 2º Turno)**:
  - O mapa se recolore mostrando a migração e absorção de votos.
  - Cada estado estampa o ganho líquido em pontos percentuais (ex: Minas Gerais `+7,1%`, São Paulo `+6,3%`).

### 3. 📈 Painel Gráfico de Variação e Estatísticas
- **Cards com Médias Consolidadas**:
  - Ganho Médio Nacional Lula: `+6,63 p.p.` (+10,38M votos).
  - Ganho Médio Nacional Flávio: `+1,18 p.p.` (+3,72M votos).
  - Absorção dos votos de terceiros: **84,9%** migraram para Lula e **15,1%** para Flávio.
- **Gráficos de Barras Interativos por Estado (27 UFs)**:
  - Barras animadas comparando lado a lado o crescimento de Lula e Flávio em cada UF.
  - Filtro por região (*Todos*, *Sudeste*, *Nordeste*, *Sul*, *Norte*, *Centro-Oeste*).
  - Ordenação dinâmica por maior ganho de Lula, maior ganho de Flávio, virada líquida ou ordem alfabética.
- **Médias Ponderadas por Grande Região**: Análise regional comparativa.

### 4. 🎮 Jogo "Cabo de Guerra" em Tempo Real
- **Escolha seu lado**: Jogue como **Lula (Vermelho)** ou **Flávio Bolsonaro (Verde)** contra uma IA em 3 dificuldades (*Fácil*, *Normal* e *Difícil*).
- **Zera Tudo (Conquista do Zero)**: Ao iniciar a partida, todos os estados ficam neutros (cinza) com contagem regressiva sonora (`3, 2, 1, Vai!`).
- **Sistema de Capital Político e Ações**:
  - Cliques rápidos geram combos multiplicadores (`x1.15`, `x1.30`).
  - Habilidades com recarga e atalhos de teclado:
    - `1` 📣 **Comício**: Grande impulso de votos no estado selecionado.
    - `2` 🚌 **Caravana**: Impulso simultâneo em todos os estados da mesma região.
    - `3` 📺 **Debate na TV**: Onda de votos em âmbito nacional.
  - **Plantão Eleitoral**: Feed de notícias dinâmicas e eventos aleatórios em tempo real.
  - **Efeitos de Som e Vitória**: Efeitos sonoros procedurais via Web Audio API e chuva de confetes na vitória!

### 5. 📱 Experiência Mobile & Responsiva
- **Design Touch Otimizado**: Interface adaptativa pensada especificamente para smartphones (iOS e Android) e tablets.
- **Dock de Ações para Polegares**: Botões de ação rápida (Comício, Caravana, Debate) e barra de energia posicionados ao alcance imediato do jogador sem rolagem excessiva.
- **Card de Detalhes do Estado (Bottom Sheet)**: Toque em qualquer estado no celular para abrir um painel com todos os dados e histórico da eleição.
- **Feedback Háptico (Vibração)**: Resposta tátil ao clicar nos estados, ativar especiais e virar estados importantes.
- **Gráficos e Modais Adaptativos**: Visualização em cartões empilhados e scroll suave em qualquer resolução de tela (de 360px a 4K).

---

## 🚀 Como Executar Localmente

Como o projeto foi construído em Vanilla HTML, CSS e JavaScript puros, ele não precisa de compilação:

1. Clone o repositório:
```bash
git clone https://github.com/rikelmi12/cabo-de-guerra-eleitoral-2026.git
cd cabo-de-guerra-eleitoral-2026
```

2. Abra o arquivo `index.html` diretamente em qualquer navegador, ou inicie um servidor local:
```bash
# Com npx
npx http-server -p 5173

# Ou com Python
python -m http.server 5173
```

3. Acesse `http://localhost:5173`.

---

## 📁 Estrutura de Arquivos

```
├── index.html        # Estrutura da página, placares, mapa SVG e modais
├── style.css         # Design system dark com glassmorphism, HUD e gráficos
├── js/
│   ├── data.js       # Dados eleitorais oficiais e estruturados (1ºT e 2ºT)
│   ├── geo.js        # Coordenadas geográficas dos 27 estados simplificadas
│   └── game.js       # Engine do jogo, IA adversária, gráficos e interatividade
├── tools/
│   └── simplify.js   # Script de simplificação do GeoJSON original
└── README.md         # Documentação do projeto
```

---

## ⚖️ Nota de Isenção (Disclaimer)
Este projeto é um jogo e simulador interativo de ficção e entretenimento baseado no cenário político-eleitoral brasileiro. Os eventos e acontecimentos gerados aleatoriamente durante as partidas são fictícios.
