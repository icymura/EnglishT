/* =========================================================================
   Lingua — стартовые данные
   Каждое слово: [английский, транскрипция, перевод, пример]
   Пример обязательно содержит само слово — из него строятся упражнения
   «Вставить пропущенное слово» и «Конструктор предложений».
   ========================================================================= */
window.APP_DATA = {
  decks: [
    {
      id: "a1a2",
      name: "A1–A2 · Базовый",
      short: "A1–A2",
      icon: "🌱",
      desc: "Самые частые слова для повседневного общения",
      words: [
        ["house", "/haʊs/", "дом", "We live in a small house near the park."],
        ["friend", "/frend/", "друг, подруга", "My best friend lives next door."],
        ["water", "/ˈwɔːtə/", "вода", "Can I have a glass of water, please?"],
        ["eat", "/iːt/", "есть, кушать", "We usually eat dinner at seven."],
        ["book", "/bʊk/", "книга", "I'm reading a book about space."],
        ["family", "/ˈfæməli/", "семья", "My family loves to travel together."],
        ["work", "/wɜːk/", "работать; работа", "I work from home on Fridays."],
        ["morning", "/ˈmɔːnɪŋ/", "утро", "I drink coffee every morning."],
        ["happy", "/ˈhæpi/", "счастливый", "She looks very happy today."],
        ["city", "/ˈsɪti/", "город", "Paris is a beautiful city."],
        ["buy", "/baɪ/", "покупать", "I need to buy some bread."],
        ["cheap", "/tʃiːp/", "дешёвый", "This jacket was really cheap."],
        ["weather", "/ˈweðə/", "погода", "The weather is nice today."],
        ["answer", "/ˈɑːnsə/", "ответ; отвечать", "Do you know the answer?"],
        ["ask", "/ɑːsk/", "спрашивать, просить", "Can I ask you a question?"],
        ["breakfast", "/ˈbrekfəst/", "завтрак", "What did you have for breakfast?"],
        ["always", "/ˈɔːlweɪz/", "всегда", "He always comes to work on time."],
        ["travel", "/ˈtrævl/", "путешествовать", "I want to travel around the world."],
        ["learn", "/lɜːn/", "учить, узнавать", "I learn ten new words every day."],
        ["help", "/help/", "помогать; помощь", "Can you help me with my bag?"],
        ["busy", "/ˈbɪzi/", "занятой", "I'm too busy to talk right now."],
        ["tired", "/ˈtaɪəd/", "уставший", "I'm tired after a long day."],
        ["cook", "/kʊk/", "готовить (еду)", "My dad likes to cook on Sundays."],
        ["ticket", "/ˈtɪkɪt/", "билет", "I bought a ticket to London."],
        ["expensive", "/ɪkˈspensɪv/", "дорогой", "This restaurant is too expensive."],
        ["understand", "/ˌʌndəˈstænd/", "понимать", "I don't understand this word."],
        ["remember", "/rɪˈmembə/", "помнить, вспоминать", "I can't remember his name."],
        ["child", "/tʃaɪld/", "ребёнок", "Every child needs love and attention."],
        ["early", "/ˈɜːli/", "рано; ранний", "I get up early on weekdays."],
        ["neighbour", "/ˈneɪbə/", "сосед", "Our neighbour has a big dog."],
        ["holiday", "/ˈhɒlədeɪ/", "отпуск, праздник", "We're going on holiday next week."],
        ["hungry", "/ˈhʌŋɡri/", "голодный", "Are you hungry? Let's eat something."],
        ["borrow", "/ˈbɒrəʊ/", "брать взаймы", "Can I borrow your pen?"],
        ["quiet", "/ˈkwaɪət/", "тихий", "The library is a quiet place."],
        ["favourite", "/ˈfeɪvərɪt/", "любимый", "What's your favourite film?"]
      ]
    },
    {
      id: "it",
      name: "IT / Tech English",
      short: "IT",
      icon: "💻",
      desc: "Лексика разработчиков, тестировщиков и менеджеров",
      words: [
        ["deploy", "/dɪˈplɔɪ/", "развёртывать, выкатывать", "We deploy new code every Tuesday."],
        ["bug", "/bʌɡ/", "баг, ошибка", "I found a bug in the login form."],
        ["release", "/rɪˈliːs/", "релиз; выпускать", "The next release is planned for May."],
        ["repository", "/rɪˈpɒzɪtri/", "репозиторий", "Clone the repository to your machine."],
        ["merge", "/mɜːdʒ/", "сливать (ветки)", "Please merge my branch into main."],
        ["branch", "/brɑːntʃ/", "ветка", "Create a new branch for this feature."],
        ["requirement", "/rɪˈkwaɪəmənt/", "требование", "The client changed the requirement again."],
        ["database", "/ˈdeɪtəbeɪs/", "база данных", "All user data is stored in the database."],
        ["query", "/ˈkwɪəri/", "запрос", "This query takes too long to run."],
        ["debug", "/diːˈbʌɡ/", "отлаживать", "It took me hours to debug this function."],
        ["backend", "/ˈbækend/", "бэкенд, серверная часть", "The backend is written in Python."],
        ["framework", "/ˈfreɪmwɜːk/", "фреймворк", "Which framework do you use for the frontend?"],
        ["issue", "/ˈɪʃuː/", "проблема; задача (тикет)", "I opened an issue on GitHub."],
        ["refactor", "/riːˈfæktə/", "рефакторить", "We should refactor this old code."],
        ["latency", "/ˈleɪtənsi/", "задержка", "High latency makes the app feel slow."],
        ["scalable", "/ˈskeɪləbl/", "масштабируемый", "We need a scalable architecture."],
        ["feature", "/ˈfiːtʃə/", "функция, фича", "Users love the new search feature."],
        ["sprint", "/sprɪnt/", "спринт", "This task is planned for the next sprint."],
        ["environment", "/ɪnˈvaɪrənmənt/", "окружение, среда", "The bug only appears in the production environment."],
        ["dependency", "/dɪˈpendənsi/", "зависимость", "Update every dependency before the release."],
        ["commit", "/kəˈmɪt/", "коммит; фиксировать изменения", "Don't forget to commit your changes."],
        ["review", "/rɪˈvjuː/", "ревью, проверка; проверять", "Can you review my pull request?"],
        ["stakeholder", "/ˈsteɪkhəʊldə/", "заинтересованная сторона", "Every stakeholder saw the demo yesterday."],
        ["workaround", "/ˈwɜːkəraʊnd/", "обходное решение", "We found a workaround for the problem."],
        ["outage", "/ˈaʊtɪdʒ/", "сбой, отключение сервиса", "The outage lasted two hours."],
        ["handle", "/ˈhændl/", "обрабатывать, справляться", "This function will handle all errors."],
        ["implement", "/ˈɪmplɪment/", "реализовывать", "We plan to implement this feature next month."],
        ["maintain", "/meɪnˈteɪn/", "поддерживать, сопровождать", "It is hard to maintain old code."],
        ["legacy", "/ˈleɪɡəsi/", "унаследованный, устаревший (о коде)", "We still use some legacy systems."],
        ["troubleshoot", "/ˈtrʌblʃuːt/", "искать и устранять неполадки", "Let's troubleshoot the network issue together."],
        ["throughput", "/ˈθruːpʊt/", "пропускная способность", "The new server doubled our throughput."]
      ]
    }
  ],

  /* ---------------------------------------------------------------------- */
  grammar: [
    {
      id: "present",
      title: "Present Simple vs Present Continuous",
      level: "A1–A2",
      icon: "⏱️",
      summary: "Регулярные действия и факты против того, что происходит прямо сейчас.",
      sections: [
        {
          title: "Present Simple — привычки и факты",
          rule: "Используем для регулярных действий, привычек, общих истин, расписаний и постоянных состояний.",
          formula: "I / you / we / they + V   ·   he / she / it + V-s/-es\nВопрос: Do / Does + подлежащее + V?   ·   Отрицание: don't / doesn't + V",
          markers: ["always", "usually", "often", "sometimes", "never", "every day"],
          examples: [
            ["She works in a bank.", "Она работает в банке."],
            ["Water boils at 100 degrees.", "Вода кипит при 100 градусах."],
            ["Do you speak English?", "Ты говоришь по-английски?"]
          ]
        },
        {
          title: "Present Continuous — прямо сейчас",
          rule: "Действие происходит в момент речи, временная ситуация или заранее запланированное ближайшее будущее.",
          formula: "am / is / are + V-ing\nВопрос: Am / Is / Are + подлежащее + V-ing?",
          markers: ["now", "right now", "at the moment", "today", "this week", "Look!"],
          examples: [
            ["I'm reading a book right now.", "Я сейчас читаю книгу."],
            ["They are staying with friends this week.", "На этой неделе они живут у друзей."],
            ["We're meeting Tom tomorrow.", "Завтра мы встречаемся с Томом (договорились)."]
          ]
        },
        {
          title: "Глаголы состояния",
          rule: "Глаголы мыслей, чувств и обладания (know, like, love, want, need, believe, understand, own) обычно НЕ используются в Continuous.",
          formula: "I know ✓   ·   I'm knowing ✗",
          markers: ["know", "want", "need", "like", "believe", "understand"],
          examples: [
            ["I know the answer.", "Я знаю ответ."],
            ["She wants a new phone.", "Она хочет новый телефон."]
          ]
        }
      ],
      tip: "Спросите себя: это «вообще, обычно» → Simple, или «сейчас, временно» → Continuous?",
      quiz: [
        { q: "She ___ coffee every morning.", options: ["drink", "drinks", "is drinking"], answer: 1, explain: "Привычка (every morning) + he/she/it → окончание -s." },
        { q: "Look! It ___.", options: ["rains", "is raining", "rain"], answer: 1, explain: "«Look!» — действие происходит прямо сейчас → Present Continuous." },
        { q: "I ___ what you mean.", options: ["understand", "am understanding", "understands"], answer: 0, explain: "understand — глагол состояния, в Continuous не используется." },
        { q: "___ your brother work on Saturdays?", options: ["Do", "Does", "Is"], answer: 1, explain: "Вопрос в Present Simple с he/she/it → Does + V." },
        { q: "We ___ on a new project this month.", options: ["work", "works", "are working"], answer: 2, explain: "Временная ситуация (this month) → Present Continuous." }
      ]
    },
    {
      id: "past",
      title: "Past Simple vs Present Perfect",
      level: "A2–B1",
      icon: "🕰️",
      summary: "Когда важен момент в прошлом, а когда — результат сейчас.",
      sections: [
        {
          title: "Past Simple — завершено в прошлом",
          rule: "Действие закончилось в конкретный момент прошлого. Время известно или подразумевается.",
          formula: "V-ed / 2-я форма неправильного глагола\nВопрос и отрицание: did / didn't + V",
          markers: ["yesterday", "last week", "in 2019", "two days ago", "when"],
          examples: [
            ["I visited Rome in 2019.", "Я был в Риме в 2019 году."],
            ["She didn't call me yesterday.", "Она не позвонила мне вчера."],
            ["When did you arrive?", "Когда ты приехал?"]
          ]
        },
        {
          title: "Present Perfect — результат и опыт",
          rule: "Важен результат сейчас, жизненный опыт (без указания когда) или действие, которое началось в прошлом и продолжается.",
          formula: "have / has + V3 (3-я форма)\nВопрос: Have / Has + подлежащее + V3?",
          markers: ["already", "yet", "just", "ever", "never", "since", "for"],
          examples: [
            ["I have lost my keys.", "Я потерял ключи (и сейчас их нет)."],
            ["Have you ever been to Japan?", "Ты когда-нибудь был в Японии?"],
            ["She has worked here since 2021.", "Она работает здесь с 2021 года."]
          ]
        },
        {
          title: "Главное отличие",
          rule: "Есть конкретное время в прошлом → Past Simple. Время не важно или период ещё не закончился → Present Perfect.",
          formula: "I saw that film last week.  ↔  I have seen that film.",
          markers: [],
          examples: [
            ["I saw that film last week.", "Я посмотрел этот фильм на прошлой неделе."],
            ["I have seen that film.", "Я видел этот фильм (опыт)."]
          ]
        }
      ],
      tip: "Слова yesterday, ago, last, in 2020 и вопрос When? почти всегда требуют Past Simple.",
      quiz: [
        { q: "I ___ him two days ago.", options: ["have seen", "saw", "see"], answer: 1, explain: "«two days ago» — конкретный момент в прошлом → Past Simple." },
        { q: "___ you ever ___ sushi?", options: ["Have … tried", "Did … try", "Do … try"], answer: 0, explain: "ever + жизненный опыт → Present Perfect." },
        { q: "We ___ here since 2020.", options: ["lived", "have lived", "live"], answer: 1, explain: "since — действие началось в прошлом и продолжается → Present Perfect." },
        { q: "When ___ you ___ to London?", options: ["did … move", "have … moved", "do … move"], answer: 0, explain: "Вопрос When? спрашивает о моменте в прошлом → Past Simple." },
        { q: "He ___ to work by bus last year.", options: ["has gone", "went", "goes"], answer: 1, explain: "«last year» — завершённый период → Past Simple." }
      ]
    },
    {
      id: "articles",
      title: "Артикли: a / an / the",
      level: "A1–B1",
      icon: "📰",
      summary: "Когда ставить a, an, the — и когда не ставить ничего.",
      sections: [
        {
          title: "a / an — «один из многих»",
          rule: "Неопределённый артикль: предмет упоминается впервые, один из множества, профессия. an — перед гласным ЗВУКОМ (не буквой!).",
          formula: "a + согласный звук: a dog, a university /juː/\nan + гласный звук: an apple, an hour /aʊə/",
          markers: [],
          examples: [
            ["I saw a dog in the park.", "Я видел собаку в парке."],
            ["She is an engineer.", "Она инженер."],
            ["It takes an hour.", "Это занимает час."]
          ]
        },
        {
          title: "the — «тот самый»",
          rule: "Определённый артикль: предмет уже упоминали, он единственный в своём роде, понятен из контекста или стоит в превосходной степени.",
          formula: "the + уже известное / единственное / самое …",
          markers: ["the sun", "the best", "the same", "the first"],
          examples: [
            ["The dog was very friendly.", "Собака (та самая) была очень дружелюбной."],
            ["Close the door, please.", "Закрой дверь, пожалуйста."],
            ["It's the best day of my life.", "Это лучший день в моей жизни."]
          ]
        },
        {
          title: "Нулевой артикль",
          rule: "Без артикля: множественное число и неисчисляемые в общем смысле, имена, большинство стран и городов, приёмы пищи, языки, виды спорта.",
          formula: "I love music.  ·  Cats are independent.  ·  She lives in France.\nИсключения: the USA, the UK, the Netherlands",
          markers: ["breakfast", "English", "football", "France"],
          examples: [
            ["I love music.", "Я люблю музыку."],
            ["We had breakfast at eight.", "Мы позавтракали в восемь."],
            ["He lives in the USA.", "Он живёт в США."]
          ]
        }
      ],
      tip: "Перед a/an подумайте о звуке: an honest man, но a European country.",
      quiz: [
        { q: "She is ___ honest person.", options: ["a", "an", "the"], answer: 1, explain: "honest начинается с гласного звука /ɒ/ (h не читается) → an." },
        { q: "Can you pass me ___ salt, please?", options: ["a", "the", "— (без артикля)"], answer: 1, explain: "Понятно из контекста, о какой соли речь (на столе) → the." },
        { q: "I usually have ___ lunch at one.", options: ["the", "a", "— (без артикля)"], answer: 2, explain: "Приёмы пищи в общем смысле — без артикля." },
        { q: "He studies at ___ university in ___ USA.", options: ["a / the", "an / —", "the / —"], answer: 0, explain: "university начинается со звука /juː/ → a; the USA — исключение с the." },
        { q: "This is ___ most interesting book I've read.", options: ["a", "the", "— (без артикля)"], answer: 1, explain: "Превосходная степень (the most …) → the." }
      ]
    },
    {
      id: "conditionals",
      title: "Условные предложения (0–3)",
      level: "B1–B2",
      icon: "🔀",
      summary: "Реальные и нереальные условия: от законов природы до сожалений о прошлом.",
      sections: [
        {
          title: "Zero Conditional — всегда правда",
          rule: "Общие истины, законы природы, то, что происходит всегда при условии.",
          formula: "If + Present Simple, Present Simple",
          markers: [],
          examples: [
            ["If you heat ice, it melts.", "Если нагреть лёд, он тает."],
            ["If I drink coffee late, I can't sleep.", "Если я пью кофе поздно, не могу уснуть."]
          ]
        },
        {
          title: "First Conditional — реальное будущее",
          rule: "Вполне возможная ситуация в будущем. После if НЕ ставим will!",
          formula: "If + Present Simple, will + V",
          markers: [],
          examples: [
            ["If it rains, we will stay at home.", "Если пойдёт дождь, мы останемся дома."],
            ["I'll call you if I have time.", "Я позвоню, если будет время."]
          ]
        },
        {
          title: "Second Conditional — нереальное сейчас",
          rule: "Воображаемая или маловероятная ситуация в настоящем или будущем. С I/he/she чаще используют were.",
          formula: "If + Past Simple, would + V",
          markers: [],
          examples: [
            ["If I had more time, I would learn Japanese.", "Если бы у меня было больше времени, я бы выучил японский."],
            ["If I were you, I would accept the offer.", "На твоём месте я бы принял предложение."]
          ]
        },
        {
          title: "Third Conditional — нереальное прошлое",
          rule: "Ситуация в прошлом, которая уже не может измениться. Часто — сожаление или упрёк.",
          formula: "If + Past Perfect, would have + V3",
          markers: [],
          examples: [
            ["If we had left earlier, we would have caught the train.", "Если бы мы вышли раньше, мы бы успели на поезд."],
            ["She would have passed if she had studied.", "Она бы сдала, если бы готовилась."]
          ]
        }
      ],
      tip: "Чем «нереальнее» ситуация, тем дальше в прошлое сдвигается время глагола.",
      quiz: [
        { q: "If you mix red and white, you ___ pink.", options: ["get", "will got", "would get"], answer: 0, explain: "Общая истина → Zero Conditional: Present Simple в обеих частях." },
        { q: "If it ___ tomorrow, we'll cancel the picnic.", options: ["will rain", "rains", "rained"], answer: 1, explain: "First Conditional: после if — Present Simple, will — только в главной части." },
        { q: "If I ___ rich, I would buy an island.", options: ["am", "were", "will be"], answer: 1, explain: "Нереальное настоящее → Second Conditional: If I were…" },
        { q: "If she had studied, she ___ the exam.", options: ["would pass", "would have passed", "will pass"], answer: 1, explain: "Нереальное прошлое → would have + V3." },
        { q: "I ___ you if I see him.", options: ["tell", "will tell", "would told"], answer: 1, explain: "Реальное будущее → First Conditional: will + V." }
      ]
    }
  ]
};
