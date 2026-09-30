// 200 frases para os Dias 11 a 30 (10 por dia).
// Elas usam as palavras e os phrasal verbs dos Dias 1 a 10 em situações reais.
// Formato: [frase em inglês, tradução, uma resposta natural em inglês, tradução da resposta]

const FRASE_THEMES = [
  "Se apresentar",                   // Dia 11
  "Cumprimentos e gentilezas",       // Dia 12
  "Perguntas do dia a dia",          // Dia 13
  "No restaurante e no café",        // Dia 14
  "Fazendo compras",                 // Dia 15
  "Pedindo direções",                // Dia 16
  "Viagem e hotel",                  // Dia 17
  "No trabalho",                     // Dia 18
  "Telefone e mensagens",            // Dia 19
  "Sua rotina",                      // Dia 20
  "Falando do passado",              // Dia 21
  "Planos e futuro",                 // Dia 22
  "Gostos e opiniões",               // Dia 23
  "Sentimentos e saúde",             // Dia 24
  "Família e amigos",                // Dia 25
  "Horas, datas e clima",            // Dia 26
  "Convites e combinados",           // Dia 27
  "Pedindo ajuda e resolvendo problemas", // Dia 28
  "Tecnologia e internet",           // Dia 29
  "Frases que salvam qualquer conversa",  // Dia 30
];

const FRASES = [
  // ---------- DIA 11: se apresentar ----------
  ["Hi, my name is Ana.", "Oi, meu nome é Ana.", "Nice to meet you, Ana!", "Prazer em te conhecer, Ana!"],
  ["What's your name?", "Qual é o seu nome?", "My name is Paulo.", "Meu nome é Paulo."],
  ["Where are you from?", "De onde você é?", "I'm from Brazil.", "Eu sou do Brasil."],
  ["How old are you?", "Quantos anos você tem?", "I'm twenty-five.", "Eu tenho vinte e cinco anos."],
  ["What do you do?", "O que você faz? (profissão)", "I'm a teacher.", "Eu sou professor."],
  ["I live with my family.", "Eu moro com a minha família.", "That's nice! Do you have brothers?", "Que legal! Você tem irmãos?"],
  ["I work in an office.", "Eu trabalho em um escritório.", "Do you like your job?", "Você gosta do seu trabalho?"],
  ["I'm learning English.", "Estou aprendendo inglês.", "Your English is very good!", "Seu inglês é muito bom!"],
  ["Nice to meet you.", "Prazer em te conhecer.", "Nice to meet you too.", "O prazer é meu."],
  ["This is my friend Carlos.", "Este é o meu amigo Carlos.", "Hi Carlos, how are you?", "Oi Carlos, como vai?"],

  // ---------- DIA 12: cumprimentos e gentilezas ----------
  ["Good morning! How are you?", "Bom dia! Como você está?", "I'm fine, thanks. And you?", "Estou bem, obrigado. E você?"],
  ["How was your day?", "Como foi o seu dia?", "It was great, thanks!", "Foi ótimo, obrigado!"],
  ["Thank you very much.", "Muito obrigado.", "You're welcome!", "De nada!"],
  ["Excuse me, can I ask you something?", "Com licença, posso te perguntar uma coisa?", "Sure, go ahead.", "Claro, pode falar."],
  ["I'm sorry, I'm late.", "Desculpe, estou atrasado.", "No problem, we just started.", "Sem problema, acabamos de começar."],
  ["See you tomorrow!", "Até amanhã!", "See you! Have a good night.", "Até! Tenha uma boa noite."],
  ["Have a nice weekend!", "Tenha um bom fim de semana!", "Thanks, you too!", "Obrigado, para você também!"],
  ["Long time no see!", "Quanto tempo!", "Yes! How have you been?", "Pois é! Como você tem passado?"],
  ["Please, come in.", "Por favor, entre.", "Thank you. Nice house!", "Obrigado. Que casa bonita!"],
  ["Can you help me, please?", "Você pode me ajudar, por favor?", "Of course. What do you need?", "Claro. Do que você precisa?"],

  // ---------- DIA 13: perguntas do dia a dia ----------
  ["What time is it now?", "Que horas são agora?", "It's three o'clock.", "São três horas."],
  ["Where do you live?", "Onde você mora?", "I live near the city center.", "Eu moro perto do centro."],
  ["What are you doing?", "O que você está fazendo?", "I'm reading a book.", "Estou lendo um livro."],
  ["Do you speak English?", "Você fala inglês?", "Yes, a little.", "Sim, um pouco."],
  ["How much is this?", "Quanto custa isto?", "It's ten dollars.", "Custa dez dólares."],
  ["Why are you sad?", "Por que você está triste?", "I lost my phone.", "Eu perdi meu celular."],
  ["When is your birthday?", "Quando é o seu aniversário?", "It's in May.", "É em maio."],
  ["Who is that man?", "Quem é aquele homem?", "He is my new boss.", "Ele é o meu novo chefe."],
  ["Which one do you want?", "Qual você quer?", "The red one, please.", "O vermelho, por favor."],
  ["Can I use your phone?", "Posso usar seu celular?", "Sure, here you go.", "Claro, aqui está."],

  // ---------- DIA 14: no restaurante e no café ----------
  ["A table for two, please.", "Uma mesa para dois, por favor.", "Follow me, please.", "Me acompanhem, por favor."],
  ["Can I see the menu?", "Posso ver o cardápio?", "Of course, here it is.", "Claro, aqui está."],
  ["I would like a coffee, please.", "Eu gostaria de um café, por favor.", "With milk or without milk?", "Com leite ou sem leite?"],
  ["What do you recommend?", "O que você recomenda?", "The fish is very good today.", "O peixe está muito bom hoje."],
  ["I'm hungry. Let's eat!", "Estou com fome. Vamos comer!", "Good idea! Where do you want to go?", "Boa ideia! Aonde você quer ir?"],
  ["Can I have some water?", "Pode me trazer um pouco de água?", "Sure. Cold or not?", "Claro. Gelada ou natural?"],
  ["The food is delicious.", "A comida está deliciosa.", "I'm glad you like it.", "Que bom que você gostou."],
  ["Can we have the bill, please?", "Pode trazer a conta, por favor?", "Of course, one moment.", "Claro, um momento."],
  ["Do you take credit cards?", "Vocês aceitam cartão de crédito?", "Yes, we do.", "Sim, aceitamos."],
  ["I don't eat meat.", "Eu não como carne.", "We have good vegetarian food.", "Temos boas opções vegetarianas."],

  // ---------- DIA 15: fazendo compras ----------
  ["I'm looking for a jacket.", "Estou procurando uma jaqueta.", "What size do you wear?", "Qual tamanho você usa?"],
  ["Can I try it on?", "Posso experimentar?", "Yes, the fitting room is over there.", "Sim, o provador fica ali."],
  ["Do you have a smaller size?", "Vocês têm um tamanho menor?", "Let me check.", "Deixa eu ver."],
  ["It's too expensive.", "Está caro demais.", "This one is cheaper.", "Este é mais barato."],
  ["I'll take it.", "Vou levar.", "Great! Cash or card?", "Ótimo! Dinheiro ou cartão?"],
  ["I'm just looking, thanks.", "Só estou olhando, obrigado.", "No problem. Call me if you need help.", "Sem problema. Me chame se precisar de ajuda."],
  ["Where can I pay?", "Onde eu pago?", "At the front of the store.", "Na frente da loja."],
  ["Can I pay by card?", "Posso pagar com cartão?", "Yes, of course.", "Sim, claro."],
  ["Do you have this in blue?", "Vocês têm este em azul?", "Sorry, only in black.", "Desculpe, só em preto."],
  ["I want to return this.", "Quero devolver isto.", "Do you have the receipt?", "Você tem o recibo?"],

  // ---------- DIA 16: pedindo direções ----------
  ["Where is the bathroom?", "Onde fica o banheiro?", "It's on the left.", "Fica à esquerda."],
  ["How do I get to the station?", "Como eu chego à estação?", "Go straight and turn right.", "Siga reto e vire à direita."],
  ["Is it far from here?", "É longe daqui?", "No, it's a five-minute walk.", "Não, são cinco minutos a pé."],
  ["Is there a bank near here?", "Tem um banco aqui perto?", "Yes, next to the pharmacy.", "Sim, ao lado da farmácia."],
  ["Turn left at the corner.", "Vire à esquerda na esquina.", "OK, thank you!", "Certo, obrigado!"],
  ["I'm lost. Can you help me?", "Estou perdido. Você pode me ajudar?", "Sure. Where do you want to go?", "Claro. Aonde você quer ir?"],
  ["Which bus goes downtown?", "Qual ônibus vai para o centro?", "Take bus number twelve.", "Pegue o ônibus número doze."],
  ["Where do I get off?", "Onde eu desço?", "Get off at the third stop.", "Desça na terceira parada."],
  ["Can you show me on the map?", "Você pode me mostrar no mapa?", "Sure. We are here.", "Claro. Nós estamos aqui."],
  ["It's across the street.", "Fica do outro lado da rua.", "Oh, I see it now. Thanks!", "Ah, agora estou vendo. Obrigado!"],

  // ---------- DIA 17: viagem e hotel ----------
  ["I have a reservation.", "Eu tenho uma reserva.", "What's your name, please?", "Qual é o seu nome, por favor?"],
  ["What time is check-out?", "Que horas é o check-out?", "At twelve o'clock.", "Ao meio-dia."],
  ["Is breakfast included?", "O café da manhã está incluído?", "Yes, from seven to ten.", "Sim, das sete às dez."],
  ["How far is the airport?", "Qual a distância até o aeroporto?", "About thirty minutes by car.", "Uns trinta minutos de carro."],
  ["My flight is at nine.", "Meu voo é às nove.", "Then you need to leave now.", "Então você precisa sair agora."],
  ["Can I leave my bag here?", "Posso deixar minha mala aqui?", "Yes, we can keep it for you.", "Sim, podemos guardar para você."],
  ["The Wi-Fi isn't working.", "O Wi-Fi não está funcionando.", "Let me try to fix it.", "Deixa eu tentar consertar."],
  ["I need a taxi to the airport.", "Preciso de um táxi para o aeroporto.", "I'll call one for you.", "Vou chamar um para você."],
  ["Here is my passport.", "Aqui está o meu passaporte.", "Thank you. Enjoy your trip!", "Obrigado. Aproveite a viagem!"],
  ["How long are you staying?", "Quanto tempo você vai ficar?", "Two weeks.", "Duas semanas."],

  // ---------- DIA 18: no trabalho ----------
  ["I have a meeting at ten.", "Tenho uma reunião às dez.", "OK, let's talk after that.", "Certo, vamos conversar depois disso."],
  ["Can you send me the file?", "Você pode me mandar o arquivo?", "Sure, I'll send it now.", "Claro, vou mandar agora."],
  ["I'm busy right now.", "Estou ocupado agora.", "No problem, I'll come back later.", "Sem problema, eu volto depois."],
  ["When is the deadline?", "Qual é o prazo?", "Next Friday.", "Sexta que vem."],
  ["Let's start the meeting.", "Vamos começar a reunião.", "Everybody is here.", "Estão todos aqui."],
  ["I don't understand. Can you explain?", "Não entendi. Você pode explicar?", "Sure, let me show you.", "Claro, deixa eu te mostrar."],
  ["I'll finish it today.", "Vou terminar isso hoje.", "Great, thank you!", "Ótimo, obrigado!"],
  ["Can we talk for a minute?", "Podemos conversar um minuto?", "Of course. What's up?", "Claro. O que houve?"],
  ["I work from home on Mondays.", "Eu trabalho de casa às segundas.", "Nice. No traffic!", "Que bom. Sem trânsito!"],
  ["Good job, everyone!", "Bom trabalho, pessoal!", "Thanks! It was a team effort.", "Obrigado! Foi trabalho de equipe."],

  // ---------- DIA 19: telefone e mensagens ----------
  ["Hello, who is speaking?", "Alô, quem fala?", "It's Maria from the office.", "É a Maria, do escritório."],
  ["Can I speak to John, please?", "Posso falar com o John, por favor?", "Hold on, please.", "Aguarde um momento, por favor."],
  ["Sorry, he isn't here right now.", "Desculpe, ele não está no momento.", "OK, I'll call back later.", "Certo, eu ligo mais tarde."],
  ["Can you call me back?", "Você pode me ligar de volta?", "Sure, in ten minutes.", "Claro, em dez minutos."],
  ["I can't hear you very well.", "Não estou te ouvindo muito bem.", "Sorry, is it better now?", "Desculpe, está melhor agora?"],
  ["Can you speak more slowly?", "Você pode falar mais devagar?", "Of course, sorry.", "Claro, desculpe."],
  ["I'll send you a message.", "Vou te mandar uma mensagem.", "OK, I'll wait.", "Certo, vou esperar."],
  ["What's your phone number?", "Qual é o seu número de telefone?", "It's five five five, one two three four.", "É cinco cinco cinco, um dois três quatro."],
  ["My phone is almost dead.", "Meu celular está quase sem bateria.", "You can use my charger.", "Você pode usar meu carregador."],
  ["Did you get my message?", "Você recebeu minha mensagem?", "Yes, sorry for the late reply.", "Sim, desculpe a demora para responder."],

  // ---------- DIA 20: sua rotina ----------
  ["I wake up at six every day.", "Eu acordo às seis todo dia.", "That's early!", "Que cedo!"],
  ["I take a shower in the morning.", "Eu tomo banho de manhã.", "Me too. It helps me wake up.", "Eu também. Me ajuda a acordar."],
  ["I have breakfast at home.", "Eu tomo café da manhã em casa.", "What do you usually eat?", "O que você costuma comer?"],
  ["I go to work by bus.", "Eu vou para o trabalho de ônibus.", "How long does it take?", "Quanto tempo leva?"],
  ["I have lunch at noon.", "Eu almoço ao meio-dia.", "Do you eat out or bring food?", "Você come fora ou leva comida?"],
  ["I get home at six.", "Eu chego em casa às seis.", "And what do you do after that?", "E o que você faz depois disso?"],
  ["I usually cook dinner.", "Eu costumo fazer o jantar.", "What's your favorite dish?", "Qual é o seu prato favorito?"],
  ["I watch TV before bed.", "Eu assisto TV antes de dormir.", "What are you watching now?", "O que você está assistindo agora?"],
  ["I go to bed at eleven.", "Eu vou dormir às onze.", "Do you sleep well?", "Você dorme bem?"],
  ["On weekends, I sleep late.", "Nos fins de semana, eu durmo até tarde.", "Lucky you!", "Sorte sua!"],

  // ---------- DIA 21: falando do passado ----------
  ["I went to the beach yesterday.", "Eu fui à praia ontem.", "Nice! Was it sunny?", "Que legal! Estava sol?"],
  ["What did you do last weekend?", "O que você fez no fim de semana passado?", "I stayed home and rested.", "Fiquei em casa descansando."],
  ["I saw a great movie.", "Eu vi um filme ótimo.", "What was it about?", "Era sobre o quê?"],
  ["I was very tired last night.", "Eu estava muito cansado ontem à noite.", "Did you go to bed early?", "Você foi dormir cedo?"],
  ["We met at school.", "Nós nos conhecemos na escola.", "How long ago?", "Há quanto tempo?"],
  ["I didn't know that.", "Eu não sabia disso.", "Now you know!", "Agora você sabe!"],
  ["She called me this morning.", "Ela me ligou hoje de manhã.", "What did she want?", "O que ela queria?"],
  ["I lived in London for two years.", "Eu morei em Londres por dois anos.", "Wow! Did you like it?", "Nossa! Você gostou?"],
  ["It was a long day.", "Foi um dia longo.", "Go and rest. You deserve it.", "Vá descansar. Você merece."],
  ["I forgot my keys at home.", "Esqueci minhas chaves em casa.", "Oh no! What are you going to do?", "Ah, não! O que você vai fazer?"],

  // ---------- DIA 22: planos e futuro ----------
  ["What are you doing tomorrow?", "O que você vai fazer amanhã?", "Nothing special. Why?", "Nada de especial. Por quê?"],
  ["I'm going to travel next month.", "Vou viajar mês que vem.", "Where are you going?", "Para onde você vai?"],
  ["I will call you tonight.", "Vou te ligar hoje à noite.", "OK, talk to you later.", "Certo, falamos mais tarde."],
  ["I want to learn to drive.", "Quero aprender a dirigir.", "That's a good idea!", "É uma boa ideia!"],
  ["Maybe I'll stay home.", "Talvez eu fique em casa.", "Come with us. It'll be fun!", "Venha com a gente. Vai ser divertido!"],
  ["We're going to the park on Sunday.", "Vamos ao parque no domingo.", "Can I go with you?", "Posso ir com vocês?"],
  ["I hope it doesn't rain.", "Espero que não chova.", "Me too! Let's check the weather.", "Eu também! Vamos ver a previsão."],
  ["Next year, I want to change jobs.", "Ano que vem, quero mudar de emprego.", "What do you want to do?", "O que você quer fazer?"],
  ["I'll be back in five minutes.", "Volto em cinco minutos.", "OK, I'll wait here.", "Certo, vou esperar aqui."],
  ["See you next week!", "Até a semana que vem!", "See you! Take care.", "Até! Se cuida."],

  // ---------- DIA 23: gostos e opiniões ----------
  ["I really like this song.", "Eu gosto muito dessa música.", "Me too! It's my favorite.", "Eu também! É a minha favorita."],
  ["I don't like coffee.", "Eu não gosto de café.", "Really? What do you drink?", "Sério? O que você bebe?"],
  ["What kind of music do you like?", "De que tipo de música você gosta?", "I like rock and pop.", "Eu gosto de rock e pop."],
  ["I think you are right.", "Acho que você está certo.", "Thanks! I'm glad you agree.", "Obrigado! Que bom que você concorda."],
  ["I don't think so.", "Acho que não.", "Why not?", "Por que não?"],
  ["In my opinion, it's too expensive.", "Na minha opinião, está caro demais.", "I agree with you.", "Concordo com você."],
  ["That's a great idea!", "Que ótima ideia!", "Thanks! Let's do it.", "Obrigado! Vamos fazer."],
  ["I prefer tea.", "Eu prefiro chá.", "Do you want some now?", "Quer um pouco agora?"],
  ["What do you think?", "O que você acha?", "I think it looks good.", "Acho que está bonito."],
  ["My favorite food is pizza.", "Minha comida favorita é pizza.", "Mine too! Let's order one.", "A minha também! Vamos pedir uma."],

  // ---------- DIA 24: sentimentos e saúde ----------
  ["I'm very happy today.", "Estou muito feliz hoje.", "Great! What happened?", "Que bom! O que aconteceu?"],
  ["I feel tired.", "Estou me sentindo cansado.", "You should rest a little.", "Você devia descansar um pouco."],
  ["I'm worried about the test.", "Estou preocupado com a prova.", "Don't worry. You studied a lot.", "Não se preocupe. Você estudou muito."],
  ["I have a headache.", "Estou com dor de cabeça.", "Do you want some water?", "Quer um pouco de água?"],
  ["I don't feel well.", "Não estou me sentindo bem.", "Do you need a doctor?", "Você precisa de um médico?"],
  ["I need to see a doctor.", "Preciso ir ao médico.", "I can take you.", "Eu posso te levar."],
  ["Are you OK?", "Você está bem?", "Yes, I'm fine, thanks.", "Sim, estou bem, obrigado."],
  ["I'm so excited about the trip!", "Estou muito animado com a viagem!", "Me too! I can't wait.", "Eu também! Mal posso esperar."],
  ["Calm down. It's OK.", "Calma. Está tudo bem.", "Thanks, I feel better now.", "Obrigado, me sinto melhor agora."],
  ["I miss my family.", "Sinto falta da minha família.", "Why don't you call them?", "Por que você não liga para eles?"],

  // ---------- DIA 25: família e amigos ----------
  ["I have two brothers and a sister.", "Eu tenho dois irmãos e uma irmã.", "Are you the oldest?", "Você é o mais velho?"],
  ["My mother is a nurse.", "Minha mãe é enfermeira.", "That's an important job.", "É um trabalho importante."],
  ["Do you have children?", "Você tem filhos?", "Yes, a boy and a girl.", "Sim, um menino e uma menina."],
  ["She is my best friend.", "Ela é minha melhor amiga.", "How did you meet?", "Como vocês se conheceram?"],
  ["We grew up together.", "Nós crescemos juntos.", "So you know each other very well!", "Então vocês se conhecem muito bem!"],
  ["My parents live in another city.", "Meus pais moram em outra cidade.", "Do you visit them often?", "Você os visita com frequência?"],
  ["I get along well with my sister.", "Eu me dou bem com a minha irmã.", "That's great!", "Que ótimo!"],
  ["Let's hang out this weekend.", "Vamos sair juntos neste fim de semana.", "Sure! What do you want to do?", "Claro! O que você quer fazer?"],
  ["My dog is part of the family.", "Meu cachorro faz parte da família.", "What's his name?", "Qual é o nome dele?"],
  ["Say hello to your family!", "Mande um oi para a sua família!", "I will, thanks!", "Pode deixar, obrigado!"],

  // ---------- DIA 26: horas, datas e clima ----------
  ["What day is today?", "Que dia é hoje?", "Today is Monday.", "Hoje é segunda-feira."],
  ["It's hot today.", "Está quente hoje.", "Let's go to the beach!", "Vamos à praia!"],
  ["It's going to rain this afternoon.", "Vai chover hoje à tarde.", "Then I'll take my umbrella.", "Então vou levar meu guarda-chuva."],
  ["What time does the store open?", "Que horas a loja abre?", "At nine in the morning.", "Às nove da manhã."],
  ["The class starts at eight.", "A aula começa às oito.", "Don't be late!", "Não se atrase!"],
  ["I was born in May.", "Eu nasci em maio.", "Me too! What day?", "Eu também! Que dia?"],
  ["It's cold. Put on a jacket.", "Está frio. Vista uma jaqueta.", "Good idea, thanks.", "Boa ideia, obrigado."],
  ["See you at half past seven.", "Te vejo às sete e meia.", "Perfect. See you then.", "Perfeito. Até lá."],
  ["What's the weather like?", "Como está o tempo?", "It's sunny and warm.", "Está ensolarado e quente."],
  ["My birthday is next week.", "Meu aniversário é semana que vem.", "I'll remember that!", "Vou lembrar!"],

  // ---------- DIA 27: convites e combinados ----------
  ["Do you want to go out tonight?", "Você quer sair hoje à noite?", "Sure! Where do you want to go?", "Claro! Aonde você quer ir?"],
  ["Let's have lunch together.", "Vamos almoçar juntos.", "Great! What time?", "Ótimo! Que horas?"],
  ["Are you free on Saturday?", "Você está livre no sábado?", "Yes. What's the plan?", "Sim. Qual é o plano?"],
  ["Come over for dinner!", "Venha jantar aqui em casa!", "Thanks! What can I bring?", "Obrigado! O que eu posso levar?"],
  ["Sorry, I can't. I'm busy.", "Desculpe, não posso. Estou ocupado.", "No problem. Maybe next time.", "Sem problema. Fica para a próxima."],
  ["What time should we meet?", "Que horas a gente se encontra?", "How about seven?", "Que tal às sete?"],
  ["Let's meet in front of the cinema.", "Vamos nos encontrar na frente do cinema.", "OK, see you there.", "Certo, te vejo lá."],
  ["I'll pick you up at eight.", "Te busco às oito.", "Great, I'll be ready.", "Ótimo, vou estar pronto."],
  ["Can we do it another day?", "Podemos fazer em outro dia?", "Sure. How about Friday?", "Claro. Que tal sexta?"],
  ["Thanks for inviting me!", "Obrigado por me convidar!", "Thanks for coming!", "Obrigado por vir!"],

  // ---------- DIA 28: pedindo ajuda e resolvendo problemas ----------
  ["I need help.", "Preciso de ajuda.", "What happened?", "O que aconteceu?"],
  ["My car broke down.", "Meu carro quebrou.", "Do you want me to call someone?", "Quer que eu chame alguém?"],
  ["I lost my wallet.", "Perdi minha carteira.", "Where did you see it last?", "Onde você a viu pela última vez?"],
  ["Call the police!", "Chame a polícia!", "OK, I'm calling now!", "Certo, estou ligando agora!"],
  ["Is everything OK?", "Está tudo bem?", "Yes, don't worry.", "Sim, não se preocupe."],
  ["The computer isn't working.", "O computador não está funcionando.", "Did you turn it off and on again?", "Você desligou e ligou de novo?"],
  ["We ran out of milk.", "Acabou o leite.", "I'll buy some later.", "Eu compro mais tarde."],
  ["Can you fix it?", "Você consegue consertar?", "I'll try.", "Vou tentar."],
  ["Watch out!", "Cuidado!", "Thanks, I didn't see it.", "Obrigado, eu não vi."],
  ["It's not a big problem.", "Não é um problema grande.", "Good. I was worried.", "Que bom. Eu estava preocupado."],

  // ---------- DIA 29: tecnologia e internet ----------
  ["What's the Wi-Fi password?", "Qual é a senha do Wi-Fi?", "It's on the paper by the door.", "Está no papel perto da porta."],
  ["Send me the link.", "Me manda o link.", "Done! Check your messages.", "Pronto! Veja suas mensagens."],
  ["I can't log in.", "Não consigo entrar na conta.", "Did you forget your password?", "Você esqueceu sua senha?"],
  ["My phone is very slow.", "Meu celular está muito lento.", "Maybe you need to clean up some space.", "Talvez você precise liberar espaço."],
  ["Did you see my post?", "Você viu minha postagem?", "Yes, I liked the photo!", "Sim, curti a foto!"],
  ["Let's have a video call.", "Vamos fazer uma chamada de vídeo.", "OK, I'll call you in five minutes.", "Certo, te ligo em cinco minutos."],
  ["Can you hear me now?", "Consegue me ouvir agora?", "Yes, loud and clear.", "Sim, alto e claro."],
  ["I need to charge my phone.", "Preciso carregar meu celular.", "There's a plug over there.", "Tem uma tomada ali."],
  ["Sign up with your email.", "Cadastre-se com seu e-mail.", "OK, I just did it.", "Certo, acabei de fazer."],
  ["The internet is down.", "A internet caiu.", "Again? Let me restart the router.", "De novo? Deixa eu reiniciar o roteador."],

  // ---------- DIA 30: frases que salvam qualquer conversa ----------
  ["Could you repeat that, please?", "Você poderia repetir, por favor?", "Sure, no problem.", "Claro, sem problema."],
  ["What does this word mean?", "O que esta palavra significa?", "It means happy.", "Significa feliz."],
  ["How do you say this in English?", "Como se diz isso em inglês?", "You say it like this.", "Se diz assim."],
  ["I don't understand.", "Eu não entendo.", "Let me explain again.", "Deixa eu explicar de novo."],
  ["Can you write it down?", "Você pode escrever?", "Sure, here it is.", "Claro, aqui está."],
  ["I'm not sure.", "Não tenho certeza.", "That's OK. It's hard.", "Tudo bem. É difícil."],
  ["That makes sense.", "Faz sentido.", "Great, let's go on.", "Ótimo, vamos continuar."],
  ["Really? I didn't know!", "Sério? Eu não sabia!", "Yes, it's true!", "Sim, é verdade!"],
  ["Let me think.", "Deixa eu pensar.", "No rush.", "Sem pressa."],
  ["Thank you for your help!", "Obrigado pela sua ajuda!", "Anytime!", "Quando precisar!"],
];
