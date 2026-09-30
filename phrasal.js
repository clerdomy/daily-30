// 100 phrasal verbs mais usados do inglês, divididos em 10 dias de 10.
// Phrasal verb = verbo + partícula (up, out, on, off...) que juntos ganham outro sentido.
// Formato: [phrasal verb, português, exemplo em inglês, exemplo em português]

const PHRASAL_THEMES = [
  "Rotina do dia",
  "Procurar, descobrir e desistir",
  "Tudo com get",
  "Tudo com go",
  "Take, put e give",
  "Look, come e turn",
  "Vida social e trabalho",
  "Problemas e imprevistos",
  "Sentimentos e pressa",
  "Internet, compras e anotações",
];

const PHRASALS = [
  // ---------- DIA 1: rotina do dia ----------
  ["wake up", "acordar", "I wake up at seven.", "Eu acordo às sete."],
  ["get up", "levantar (da cama)", "I get up early.", "Eu me levanto cedo."],
  ["go out", "sair (para se divertir)", "Let's go out tonight.", "Vamos sair hoje à noite."],
  ["come back", "voltar", "Come back soon!", "Volte logo!"],
  ["sit down", "sentar-se", "Please sit down.", "Por favor, sente-se."],
  ["stand up", "ficar de pé, levantar-se", "Stand up for the photo.", "Fique de pé para a foto."],
  ["turn on", "ligar (aparelho, luz)", "Turn on the TV.", "Ligue a TV."],
  ["turn off", "desligar", "Turn off your phone.", "Desligue o celular."],
  ["put on", "vestir, colocar (roupa)", "Put on your jacket.", "Vista a jaqueta."],
  ["take off", "tirar (roupa); decolar", "Take off your shoes.", "Tire os sapatos."],

  // ---------- DIA 2: procurar, descobrir e desistir ----------
  ["look for", "procurar", "I am looking for my keys.", "Estou procurando minhas chaves."],
  ["look at", "olhar para", "Look at this photo.", "Olhe esta foto."],
  ["look after", "cuidar de", "She looks after her brother.", "Ela cuida do irmão."],
  ["find out", "descobrir", "I found out the truth.", "Eu descobri a verdade."],
  ["figure out", "entender, resolver", "I can't figure out this problem.", "Não consigo resolver este problema."],
  ["pick up", "pegar, buscar (alguém)", "I pick up my son at school.", "Eu busco meu filho na escola."],
  ["give up", "desistir", "Don't give up!", "Não desista!"],
  ["go on", "continuar; acontecer", "Go on, I'm listening.", "Continue, estou ouvindo."],
  ["come in", "entrar", "Come in, please.", "Entre, por favor."],
  ["come on", "vamos!, anda!", "Come on, we are late!", "Anda, estamos atrasados!"],

  // ---------- DIA 3: tudo com get ----------
  ["get in", "entrar (no carro, num lugar)", "Get in the car.", "Entre no carro."],
  ["get out", "sair", "Get out of the water.", "Saia da água."],
  ["get on", "subir (ônibus, trem)", "Get on the bus here.", "Suba no ônibus aqui."],
  ["get off", "descer (ônibus, trem)", "I get off at the next stop.", "Eu desço na próxima parada."],
  ["get back", "voltar; receber de volta", "When do you get back?", "Quando você volta?"],
  ["get along", "dar-se bem", "I get along with my boss.", "Eu me dou bem com meu chefe."],
  ["get over", "superar, se recuperar", "She got over the flu.", "Ela se recuperou da gripe."],
  ["get through", "passar por, aguentar", "We will get through this.", "Nós vamos passar por isso."],
  ["get away", "fugir, escapar", "The thief got away.", "O ladrão fugiu."],
  ["get together", "reunir-se", "Let's get together on Friday.", "Vamos nos reunir na sexta."],

  // ---------- DIA 4: tudo com go ----------
  ["go back", "voltar (para um lugar)", "I want to go back home.", "Eu quero voltar para casa."],
  ["go away", "ir embora", "Go away, please.", "Vá embora, por favor."],
  ["go ahead", "pode ir, fique à vontade", "Can I sit here? Go ahead!", "Posso sentar aqui? Fique à vontade!"],
  ["go down", "descer, diminuir", "Prices went down.", "Os preços caíram."],
  ["go up", "subir, aumentar", "The rent went up.", "O aluguel subiu."],
  ["go off", "tocar, disparar (alarme)", "My alarm goes off at six.", "Meu despertador toca às seis."],
  ["go through", "passar por (dificuldade)", "He is going through a hard time.", "Ele está passando por um momento difícil."],
  ["go over", "revisar", "Let's go over the lesson.", "Vamos revisar a lição."],
  ["grow up", "crescer (virar adulto)", "I grew up in a small town.", "Eu cresci em uma cidade pequena."],
  ["eat out", "comer fora", "We eat out on Sundays.", "Nós comemos fora aos domingos."],

  // ---------- DIA 5: take, put e give ----------
  ["take care of", "cuidar de", "Take care of yourself.", "Cuide-se."],
  ["take out", "tirar, levar para fora", "Take out the trash.", "Leve o lixo para fora."],
  ["take back", "devolver (na loja); retirar o que disse", "I want to take back this shirt.", "Eu quero devolver esta camisa."],
  ["take up", "começar (um hobby)", "I took up yoga.", "Eu comecei a fazer ioga."],
  ["take over", "assumir o controle", "She took over the company.", "Ela assumiu a empresa."],
  ["put away", "guardar", "Put away your toys.", "Guarde seus brinquedos."],
  ["put down", "colocar no chão, abaixar", "Put down the box.", "Coloque a caixa no chão."],
  ["put off", "adiar", "Don't put off your homework.", "Não adie sua lição de casa."],
  ["put up with", "aguentar, tolerar", "I can't put up with this noise.", "Não aguento este barulho."],
  ["give back", "devolver", "Give back my pen!", "Devolva minha caneta!"],

  // ---------- DIA 6: look, come e turn ----------
  ["look up", "procurar (uma informação)", "Look up the word online.", "Procure a palavra na internet."],
  ["look out", "cuidado!", "Look out! A car!", "Cuidado! Um carro!"],
  ["look forward to", "estar ansioso por (algo bom)", "I look forward to the trip.", "Estou ansioso pela viagem."],
  ["look into", "investigar, analisar", "We will look into it.", "Nós vamos analisar isso."],
  ["come up", "surgir", "A problem came up.", "Surgiu um problema."],
  ["come across", "encontrar por acaso", "I came across an old photo.", "Encontrei uma foto antiga por acaso."],
  ["come from", "vir de, ser de", "Where do you come from?", "De onde você é?"],
  ["come over", "vir (à casa de alguém)", "Come over for dinner.", "Venha jantar aqui em casa."],
  ["turn up", "aumentar (volume); aparecer", "Turn up the music!", "Aumente a música!"],
  ["turn down", "abaixar (volume); recusar", "He turned down the job.", "Ele recusou o emprego."],

  // ---------- DIA 7: vida social e trabalho ----------
  ["work out", "malhar; dar certo", "I work out every morning.", "Eu malho toda manhã."],
  ["hang out", "passar tempo junto, sair", "We hang out after school.", "Nós saímos juntos depois da aula."],
  ["call back", "retornar a ligação", "I will call you back.", "Eu te ligo de volta."],
  ["call off", "cancelar", "They called off the game.", "Eles cancelaram o jogo."],
  ["show up", "aparecer, chegar", "He didn't show up.", "Ele não apareceu."],
  ["show off", "se exibir", "Stop showing off!", "Pare de se exibir!"],
  ["catch up", "colocar o papo em dia; alcançar", "Let's catch up soon.", "Vamos colocar o papo em dia logo."],
  ["check in", "fazer check-in", "We check in at noon.", "Fazemos check-in ao meio-dia."],
  ["check out", "dar uma olhada; fazer check-out", "Check out this video!", "Dá uma olhada neste vídeo!"],
  ["fill out", "preencher (formulário)", "Fill out this form.", "Preencha este formulário."],

  // ---------- DIA 8: problemas e imprevistos ----------
  ["run out of", "ficar sem, acabar", "We ran out of milk.", "Acabou o leite."],
  ["run into", "esbarrar com (alguém)", "I ran into my teacher at the mall.", "Esbarrei com meu professor no shopping."],
  ["run away", "fugir", "The dog ran away.", "O cachorro fugiu."],
  ["break down", "quebrar, enguiçar", "My car broke down.", "Meu carro quebrou."],
  ["break up", "terminar (namoro)", "They broke up last year.", "Eles terminaram ano passado."],
  ["break in", "arrombar, invadir", "Someone broke in last night.", "Alguém invadiu ontem à noite."],
  ["bring up", "mencionar; criar (filhos)", "Don't bring up that subject.", "Não toque nesse assunto."],
  ["carry on", "continuar", "Carry on, you are doing well.", "Continue, você está indo bem."],
  ["set up", "montar, configurar", "I set up my new phone.", "Eu configurei meu celular novo."],
  ["shut up", "calar a boca (é rude)", "Shut up and listen!", "Cala a boca e escuta!"],

  // ---------- DIA 9: sentimentos e pressa ----------
  ["make up", "fazer as pazes; inventar", "They made up after the fight.", "Eles fizeram as pazes depois da briga."],
  ["pay back", "pagar de volta", "I will pay you back tomorrow.", "Eu te pago de volta amanhã."],
  ["pass away", "falecer", "His grandfather passed away.", "O avô dele faleceu."],
  ["pass out", "desmaiar", "She passed out from the heat.", "Ela desmaiou por causa do calor."],
  ["hold on", "esperar um pouco; segurar firme", "Hold on a second.", "Espere um segundo."],
  ["hurry up", "apressar-se", "Hurry up, the bus is here!", "Anda logo, o ônibus chegou!"],
  ["calm down", "acalmar-se", "Calm down, everything is OK.", "Calma, está tudo bem."],
  ["cheer up", "animar-se", "Cheer up! It's Friday!", "Anime-se! É sexta!"],
  ["slow down", "ir mais devagar", "Slow down, please.", "Mais devagar, por favor."],
  ["clean up", "limpar, arrumar", "Clean up your room.", "Arrume seu quarto."],

  // ---------- DIA 10: internet, compras e anotações ----------
  ["throw away", "jogar fora", "Throw away the old food.", "Jogue fora a comida velha."],
  ["write down", "anotar", "Write down my number.", "Anote meu número."],
  ["sign up", "inscrever-se, cadastrar-se", "I signed up for the course.", "Eu me inscrevi no curso."],
  ["log in", "entrar (numa conta)", "Log in with your email.", "Entre com seu e-mail."],
  ["log out", "sair (de uma conta)", "Don't forget to log out.", "Não esqueça de sair da conta."],
  ["try on", "experimentar (roupa)", "Can I try on this dress?", "Posso experimentar este vestido?"],
  ["end up", "acabar (fazendo algo)", "We ended up staying home.", "Acabamos ficando em casa."],
  ["drop off", "deixar (alguém ou algo num lugar)", "Drop me off here, please.", "Me deixa aqui, por favor."],
  ["keep up", "manter o ritmo, continuar", "Keep up the good work!", "Continue com o bom trabalho!"],
  ["point out", "apontar, destacar", "She pointed out my mistake.", "Ela apontou meu erro."],
];
