# Inglês em 30 dias

App simples (HTML, CSS e JavaScript puro, sem instalar nada) para aprender inglês básico e **não esquecer**.

| Dias | O que você aprende |
|---|---|
| 1 a 10 | **300 palavras** mais usadas (30 por dia) e **100 phrasal verbs** (10 por dia) |
| 11 a 30 | **200 frases** do dia a dia (10 por dia), cada uma com uma resposta para treinar conversa |
| Todo dia | **Revisão espaçada**: o que você estudou volta em 1, 3, 7, 14 e 30 dias |
| Quando quiser | **Minhas palavras** e **Minhas frases**: a IA (OpenRouter, modelos grátis) sugere palavras e frases novas com base no que você já sabe, e você também pode adicionar frases à mão |

Nada se repete. As frases usam o vocabulário dos Dias 1 a 10 (cerca de 80% das palavras delas vêm das 300), e cada frase mostra quais palavras você já viu.

## Como rodar

    git clone <url-do-seu-repositorio>
    cd ingles-300

Abra o `index.html` no navegador, ou use um servidor local:

    npx serve .
    # ou
    python -m http.server 8000

### Publicar na Vercel (com a IA)

A IA roda numa função da Vercel (`api/sugerir.js`), para a chave não ficar exposta no navegador.

1. Crie uma conta grátis no [OpenRouter](https://openrouter.ai) e gere uma chave em **Keys**.
2. Importe o repositório na Vercel (Framework: **Other**, sem comando de build).
3. Em **Settings > Environment Variables**, crie:
   - `OPENROUTER_API_KEY`: a sua chave
   - `APP_SENHA`: uma senha qualquer. O app pede essa senha na primeira vez que você usa a IA, assim só você gasta a sua cota.
   - `OPENROUTER_MODEL` (opcional): o padrão `openrouter/free` escolhe sozinho um modelo grátis disponível.
     Para fixar um, use um id que termine em `:free` (lista em openrouter.ai/models)
4. Faça o deploy de novo para as variáveis valerem.

Para testar no computador com a IA: `npx vercel dev` (com as mesmas variáveis num arquivo `.env`).
Sem a Vercel (GitHub Pages, `python -m http.server`) o app funciona normalmente, só os botões de IA não funcionam.

Os modelos grátis têm limite de pedidos por dia, e alguns provedores podem guardar o que é enviado.
O app só manda listas de palavras em inglês.

### Publicar e instalar no celular (recomendado)

Pelo link da Vercel (ou do GitHub Pages, em **Settings > Pages > Deploy from branch (main)**):

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
- `frases.js` – 200 frases com respostas (Dias 11 a 30); na primeira visita elas são copiadas para o banco do navegador
- `db.js` – banco de dados no navegador (IndexedDB) com as frases e as suas palavras; carrega o `app.js` depois de abrir o banco
- `api/sugerir.js` – função da Vercel que pede palavras e frases novas à IA (OpenRouter)
- `manifest.webmanifest`, `sw.js` e `icons/` – deixam o app instalável e offline

## Como funciona

- **Você avança pelo que já sabe, não pelo calendário.** Cada 30 palavras marcadas como sabidas (ou 10 phrasal
  verbs / 10 frases) avançam um dia: quem sabe 60 palavras está no Dia 3. Conta qualquer palavra, de qualquer dia,
  e você pode abrir qualquer dia quando quiser, para adiantar ou revisar.
- **Os dias se arrumam pelo que você sabe.** Se você marca uma palavra de um dia mais à frente, ela volta para
  completar o dia que ainda não tem 30. E o que você ainda não sabe vai para a frente, para você continuar vendo
  até aprender. Cada 30 palavras sabidas formam exatamente um dia.
- **Para relembrar.** Palavras de dias que você concluiu no quiz, mas não marcou como "Já sei", aparecem sorteadas
  (até 5) em outros dias, na lista, nos flashcards e no quiz, com a etiqueta "Relembrar".
- **Lista:** a tradução começa escondida. Tente lembrar, toque para conferir e marque "Já sei".
- **Flashcards:** vire a carta e arraste para a direita (sei) ou para a esquerda (não sei).
- **Quiz**, com 5 tipos:
  - *Significado*: vê em inglês e escolhe em português
  - *Em inglês*: vê em português e escolhe em inglês
  - *Ouvir*: ouve e escolhe o significado
  - *Escrever*: digita em inglês (pequenos erros de digitação são aceitos, com aviso)
  - *Montar a frase*: só nas frases; monta a frase na ordem certa
  
  Acertando 80%, o dia fica concluído (✓). O quiz não marca nada como "Já sei": isso só acontece quando você mesmo
  marca (na lista, nos flashcards ou na revisão). As respostas do quiz só ajustam quando cada item volta na revisão.
- **Falar:** toque no microfone e fale uma palavra em inglês. O app pergunta o que ela quer dizer. Acertou, ela vira
  "Já sei"; se não estava no app, a IA traduz e ela entra em Minhas palavras. Se o app não entender, avisa que a palavra
  não foi reconhecida. Usa o reconhecimento de voz do navegador (Chrome ou Safari) e precisa de internet.
- **Revisão:** tudo que você marca ou responde entra na revisão. Acertou, a próxima revisão fica mais distante (1, 3, 7, 14, 30 dias). Errou, volta no dia seguinte. Quando não há nada para revisar, dá para fazer um **treino livre**.
- **Sequência de dias:** mostra quantos dias seguidos você estudou.
- **Busca:** a lupa no topo procura em inglês ou português nos 600 itens. No computador, a tecla `/` abre a busca.

## Seu progresso

Tudo fica salvo no navegador: marcações, notas, revisões, sequência e preferências (localStorage), e as frases e
palavras que você ou a IA adicionaram (IndexedDB, banco `ingles30-db`). Nada vai para um servidor, a não ser a lista
de palavras enviada para a IA quando você aperta o botão.
Use **"Baixar backup do progresso"** no rodapé para guardar um arquivo, e **"Restaurar backup"** para
levar o progresso para outro celular ou recuperar depois de limpar o navegador.

## Personalizar

No topo do `app.js`:

- `PASS_RATE` – nota mínima para concluir um dia (padrão 0.8)
- `INTERVALS` – os intervalos da revisão, em dias

Ao atualizar os arquivos no GitHub, aumente a versão em `sw.js` (por exemplo, `ingles30-v3` para `ingles30-v4`)
para os celulares com o app instalado receberem a atualização.
"# daily-30" 
