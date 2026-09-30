# Inglês em 30 dias

App simples (HTML, CSS e JavaScript puro, sem instalar nada) para aprender inglês básico e **não esquecer**.

| Dias | O que você aprende |
|---|---|
| 1 a 10 | **300 palavras** mais usadas (30 por dia) e **100 phrasal verbs** (10 por dia) |
| 11 a 30 | **200 frases** do dia a dia (10 por dia), cada uma com uma resposta para treinar conversa |
| Todo dia | **Revisão espaçada**: o que você estudou volta em 1, 3, 7, 14 e 30 dias |

Nada se repete. As frases usam o vocabulário dos Dias 1 a 10 (cerca de 80% das palavras delas vêm das 300), e cada frase mostra quais palavras você já viu.

## Como rodar

    git clone <url-do-seu-repositorio>
    cd ingles-300

Abra o `index.html` no navegador, ou use um servidor local:

    npx serve .
    # ou
    python -m http.server 8000

### Publicar e instalar no celular (recomendado)

Suba no GitHub e ative **Settings > Pages > Deploy from branch (main)**. Pelo link do GitHub Pages:

- **Android (Chrome):** aparece o botão "Instalar o app no celular" no rodapé.
- **iPhone (Safari):** Compartilhar > "Adicionar à Tela de Início".

Instalado, ele abre como um app e **funciona sem internet** depois da primeira visita.
O modo offline só funciona por http/https (GitHub Pages ou servidor local), não abrindo o arquivo direto.

## Arquivos

- `index.html` – estrutura da página
- `style.css` – visual (mobile first, com modo escuro automático)
- `app.js` – toda a lógica
- `words.js` – 300 palavras (Dias 1 a 10)
- `phrasal.js` – 100 phrasal verbs (Dias 1 a 10)
- `frases.js` – 200 frases com respostas (Dias 11 a 30)
- `manifest.webmanifest`, `sw.js` e `icons/` – deixam o app instalável e offline

## Como funciona

- **O Dia 1 é o dia em que você abre o app pela primeira vez.** Você pode ir para qualquer dia quando quiser.
- **Lista:** a tradução começa escondida. Tente lembrar, toque para conferir e marque "Já sei".
- **Flashcards:** vire a carta e arraste para a direita (sei) ou para a esquerda (não sei).
- **Quiz**, com 5 tipos:
  - *Significado*: vê em inglês e escolhe em português
  - *Em inglês*: vê em português e escolhe em inglês
  - *Ouvir*: ouve e escolhe o significado
  - *Escrever*: digita em inglês (pequenos erros de digitação são aceitos, com aviso)
  - *Montar a frase*: só nas frases; monta a frase na ordem certa
  
  Acertando 80%, o dia fica concluído (✓).
- **Revisão:** tudo que você marca ou responde entra na revisão. Acertou, a próxima revisão fica mais distante (1, 3, 7, 14, 30 dias). Errou, volta no dia seguinte. Quando não há nada para revisar, dá para fazer um **treino livre**.
- **Sequência de dias:** mostra quantos dias seguidos você estudou.
- **Busca:** a lupa no topo procura em inglês ou português nos 600 itens. No computador, a tecla `/` abre a busca.

## Seu progresso

Tudo fica salvo no navegador (localStorage): marcações, notas, revisões, sequência e preferências.
Use **"Baixar backup do progresso"** no rodapé para guardar um arquivo, e **"Restaurar backup"** para
levar o progresso para outro celular ou recuperar depois de limpar o navegador.

## Personalizar

No topo do `app.js`:

- `START_DATE` – fixa a data do Dia 1, por exemplo `"2026-09-30"`
- `PASS_RATE` – nota mínima para concluir um dia (padrão 0.8)
- `INTERVALS` – os intervalos da revisão, em dias

Ao atualizar os arquivos no GitHub, aumente a versão em `sw.js` (`ingles30-v1` para `ingles30-v2`)
para os celulares com o app instalado receberem a atualização.
"# daily-30" 
