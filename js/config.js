/** @typedef {{ en: string, ru: string, pt: string, de: string, es: string }} LocalizedString */

window.CM_CONFIG = {
  siteName: "Creepy Machine",
  version: "2.0.0",
  adminPassword: "creepy2024",

  api: {
    useMock: false,
    generateEndpoint: "/api/generate",
  },

  yookassa: {
    enabled: false,
    shopId: "",
    secretKey: "",
    apiUrl: "https://api.yookassa.ru/v3",
    returnUrl: "/subscription.html?status=success",
    webhookUrl: "/api/payments/yookassa/webhook",
    createPaymentEndpoint: "/api/payments/create",
  },

  google: {
    enabled: false,
    clientId: "",
    scopes: "openid email profile",
    callbackPath: "/auth/callback.html",
  },

  subscription: {
    freeGenerationsPerDay: 3,
    plans: [
      {
        id: "nightmare",
        price: 199,
        currency: "RUB",
        generationsPerMonth: 100,
        badge: "popular",
        features: [
          { en: "100 generations per month", ru: "100 генераций в месяц" },
          { en: "Priority service during busy hours", ru: "Приоритетное обслуживание в часы пик" },
          { en: "Best for occasional ideas and testing", ru: "Подходит для редких идей и тестов" },
        ],
      },
      {
        id: "abyss",
        price: 399,
        currency: "RUB",
        generationsPerMonth: 250,
        badge: null,
        features: [
          { en: "250 generations per month", ru: "250 генераций в месяц" },
          { en: "Priority service during busy hours", ru: "Приоритетное обслуживание в часы пик" },
          {
            en: "Smarter AI model: DeepSeek V4 Flash (~12.7 ₽ / 1M input tokens)",
            ru: "Более умная модель ИИ: DeepSeek V4 Flash (~12,7 ₽ / 1M input-токенов)",
          },
          { en: "Best value for frequent use", ru: "Лучшее решение для частого использования" },
        ],
      },
    ],
    page: {
      ru: {
        headline: "Выберите пакет глав",
        subtitle: "Покупайте только нужный объём генераций. Бесплатные генерации доступны без подписки, а платные планы открывают более умную модель ИИ DeepSeek V4 Flash после входа через Google.",
        benefits: [
          "Генерации списываются только после успешного ответа ИИ",
          "Бесплатные генерации остаются доступными без подписки",
          "Подписка открывает более умную модель ИИ DeepSeek V4 Flash",
          "Для покупки подписки нужен вход через Google",
        ],
        contact: "Вопросы по оплате, возврату или удалению аккаунта: tretyaaakov@gmail.com",
      },
      en: {
        headline: "Choose a chapter pack",
        subtitle: "Buy only the generation volume you need. Free generations stay available without a subscription, and paid plans unlock a smarter AI model, DeepSeek V4 Flash, after Google sign-in.",
        benefits: [
          "Generations are charged only after successful AI output",
          "Free generations stay available without a subscription",
          "The subscription unlocks a smarter AI model: DeepSeek V4 Flash",
          "Google sign-in is required to buy a plan",
        ],
        contact: "Need help with payment, refunds, or account deletion? Write to tretyaaakov@gmail.com",
      },
    },
  },

  faq: [
    {
      q: { ru: "Нужен ли Google-аккаунт?", en: "Do I need a Google account?" },
      a: {
        ru: "Нет. Бесплатные генерации доступны и без него. Но чтобы купить подписку, нужно войти через Google.",
        en: "No. Free generations are available without it. But to buy a subscription, you need to sign in with Google.",
      },
    },
    {
      q: { ru: "Когда активируется подписка?", en: "When does the subscription activate?" },
      a: {
        ru: "Обычно сразу после подтверждения оплаты. Если статус на стороне YooKassa ещё в ожидании, просто обновите страницу через минуту.",
        en: "Usually right after payment confirmation. If YooKassa still shows a pending state, just refresh the page in a minute.",
      },
    },
    {
      q: { ru: "Можно ли вернуть оплату?", en: "Can I get a refund?" },
      a: {
        ru: "Если покупка не успела принести пользу из-за технической проблемы, напишите на email поддержки в течение 14 дней после оплаты.",
        en: "If the purchase did not become usable because of a technical issue, write to support within 14 days after payment.",
      },
    },
    {
      q: { ru: "Что делать, если письмо или платёж зависли?", en: "What if a message or payment is stuck?" },
      a: {
        ru: "Проверьте страницу подписки ещё раз и напишите на tretyaaakov@gmail.com. Мы посмотрим статус и подскажем следующий шаг.",
        en: "Check the subscription page again and email tretyaaakov@gmail.com. We will review the status and tell you the next step.",
      },
    },
    {
      q: { ru: "Что произойдёт при удалении аккаунта?", en: "What happens when I delete my account?" },
      a: {
        ru: "Сессии, лимиты, подписка и сохранённые генерации удаляются из базы. Данные, которые обязаны храниться по закону, могут сохраняться в установленный срок.",
        en: "Sessions, limits, subscription, and saved generations are deleted from the database. Legally required records may be retained for the required period.",
      },
    },
  ],

  requisites: {
    title: { ru: "Реквизиты", en: "Business details" },
    lines: [
      "Самозанятый Ухвачев Максим Романович",
      "ИНН: 501211523848",
      "Email: tretyaaakov@gmail.com",
      "Поддержка и вопросы по оплате: tretyaaakov@gmail.com",
    ],
  },

  fandoms: [
    {
      id: "slenderman",
      icon: "◈",
      promptHint: "Slender Man, forests, static, lost children",
      names: {
        en: "Slender Man",
        ru: "Слендермен",
        pt: "Slender Man",
        de: "Slender Man",
        es: "Slender Man",
      },
      desc: {
        en: "Faceless entity in a black suit — classic internet horror.",
        ru: "Безликая сущность в чёрном костюме — классика интернет-ужасов.",
        pt: "Entidade sem rosto de terno preto — horror clássico da internet.",
        de: "Gesichtsloses Wesen im schwarzen Anzug — klassischer Internet-Horror.",
        es: "Entidad sin rostro con traje negro — horror clásico de internet.",
      },
    },
    {
      id: "scp",
      icon: "⬡",
      promptHint: "SCP Foundation, containment, anomalous objects",
      names: {
        en: "SCP Foundation",
        ru: "Фонд SCP",
        pt: "Fundação SCP",
        de: "SCP Foundation",
        es: "Fundación SCP",
      },
      desc: {
        en: "Secure. Contain. Protect. — scientific horror archives.",
        ru: "Secure. Contain. Protect. — научный архив аномалий.",
        pt: "Secure. Contain. Protect. — arquivos de horror científico.",
        de: "Secure. Contain. Protect. — wissenschaftliche Horror-Archive.",
        es: "Secure. Contain. Protect. — archivos de horror científico.",
      },
    },
    {
      id: "fnaf",
      icon: "◎",
      promptHint: "Five Nights at Freddy's, animatronics, pizzeria night shift",
      names: {
        en: "FNAF",
        ru: "FNAF",
        pt: "FNAF",
        de: "FNAF",
        es: "FNAF",
      },
      desc: {
        en: "Animatronics that move when you are not looking.",
        ru: "Аниматроники, которые двигаются, когда на них не смотрят.",
        pt: "Animatrônicos que se movem quando você não olha.",
        de: "Animatronics, die sich bewegen, wenn niemand hinsieht.",
        es: "Animatrónicos que se mueven cuando no los miras.",
      },
    },
    {
      id: "creepypasta-classics",
      icon: "☠",
      promptHint: "Jeff the Killer, Smile Dog, Russian Sleep Experiment",
      names: {
        en: "Classic Pastas",
        ru: "Классика",
        pt: "Clássicos",
        de: "Klassiker",
        es: "Clásicos",
      },
      desc: {
        en: "Jeff, Smile Dog, Russian Sleep Experiment and more.",
        ru: "Джефф, Smile Dog, Русский сонный эксперимент и другие.",
        pt: "Jeff, Smile Dog, Experimento do Sono Russo e mais.",
        de: "Jeff, Smile Dog, Russisches Schlafexperiment und mehr.",
        es: "Jeff, Smile Dog, Experimento del Sueño Ruso y más.",
      },
    },
    {
      id: "backrooms",
      icon: "▣",
      promptHint: "The Backrooms, liminal spaces, endless yellow rooms",
      names: {
        en: "Backrooms",
        ru: "Бэкрумы",
        pt: "Backrooms",
        de: "Backrooms",
        es: "Backrooms",
      },
      desc: {
        en: "Liminal spaces — you noclipped out of reality.",
        ru: "Лиминальные пространства — вы выпали из реальности.",
        pt: "Espaços liminais — você saiu da realidade.",
        de: "Liminalräume — du bist aus der Realität gefallen.",
        es: "Espacios liminales — saliste de la realidad.",
      },
    },
    {
      id: "minecraft-horror",
      icon: "⬛",
      promptHint: "Herobrine, corrupted worlds, Minecraft horror",
      names: {
        en: "Minecraft Horror",
        ru: "Minecraft-ужасы",
        pt: "Horror Minecraft",
        de: "Minecraft-Horror",
        es: "Horror Minecraft",
      },
      desc: {
        en: "Herobrine, deleted worlds, seeds that should not exist.",
        ru: "Херобрин, удалённые миры, сиды, которых не должно быть.",
        pt: "Herobrine, mundos deletados, seeds que não deveriam existir.",
        de: "Herobrine, gelöschte Welten, Seeds die nicht existieren sollten.",
        es: "Herobrine, mundos borrados, seeds que no deberían existir.",
      },
    },
  ],

  genres: [
    {
      id: "psychological",
      icon: "🧠",
      tags: ["mind", "paranoia", "unreliable narrator"],
      names: {
        en: "Psychological",
        ru: "Психологический",
        pt: "Psicológico",
        de: "Psychologisch",
        es: "Psicológico",
      },
      desc: {
        en: "Madness, gaslighting, and fractured perception.",
        ru: "Безумие, газлайтинг и искажённое восприятие.",
        pt: "Loucura, manipulação e percepção distorcida.",
        de: "Wahnsinn, Gaslighting und zerbrochene Wahrnehmung.",
        es: "Locura, manipulación y percepción fracturada.",
      },
    },
    {
      id: "found-footage",
      icon: "📹",
      tags: ["VHS", "camera", "recovered tape"],
      names: {
        en: "Found Footage",
        ru: "Найденная плёнка",
        pt: "Filmagem encontrada",
        de: "Found Footage",
        es: "Metraje encontrado",
      },
      desc: {
        en: "Recovered videos, logs, and corrupted recordings.",
        ru: "Восстановленные видео, логи и повреждённые записи.",
        pt: "Vídeos recuperados, logs e gravações corrompidas.",
        de: "Wiederhergestellte Videos, Logs und beschädigte Aufnahmen.",
        es: "Videos recuperados, registros y grabaciones corruptas.",
      },
    },
    {
      id: "cosmic",
      icon: "🌑",
      tags: ["void", "entity", "forbidden knowledge"],
      names: {
        en: "Cosmic Horror",
        ru: "Космический ужас",
        pt: "Horror cósmico",
        de: "Kosmischer Horror",
        es: "Horror cósmico",
      },
      desc: {
        en: "Entities beyond human comprehension.",
        ru: "Сущности за гранью человеческого понимания.",
        pt: "Entidades além da compreensão humana.",
        de: "Wesen jenseits menschlichen Verständnisses.",
        es: "Entidades más allá de la comprensión humana.",
      },
    },
    {
      id: "analog",
      icon: "📺",
      tags: ["static", "broadcast", "emergency alert"],
      names: {
        en: "Analog Horror",
        ru: "Аналоговый хоррор",
        pt: "Horror analógico",
        de: "Analog-Horror",
        es: "Horror analógico",
      },
      desc: {
        en: "VHS static, emergency broadcasts, distorted faces.",
        ru: "Помехи VHS, экстренные эфиры, искажённые лица.",
        pt: "Estática VHS, alertas de emergência, rostos distorcidos.",
        de: "VHS-Rauschen, Notfallsendungen, verzerrte Gesichter.",
        es: "Estática VHS, alertas de emergencia, rostros distorsionados.",
      },
    },
    {
      id: "survival",
      icon: "🔪",
      tags: ["chase", "escape", "last survivor"],
      names: {
        en: "Survival",
        ru: "Выживание",
        pt: "Sobrevivência",
        de: "Survival",
        es: "Supervivencia",
      },
      desc: {
        en: "Chase, escape, and the last person standing.",
        ru: "Погоня, побег и последний выживший.",
        pt: "Perseguição, fuga e o último sobrevivente.",
        de: "Verfolgung, Flucht und der letzte Überlebende.",
        es: "Persecución, escape y el último en pie.",
      },
    },
    {
      id: "digital",
      icon: "💻",
      tags: ["cursed file", "app", "AI", "glitch"],
      names: {
        en: "Digital / Tech",
        ru: "Цифровой",
        pt: "Digital / Tech",
        de: "Digital / Tech",
        es: "Digital / Tech",
      },
      desc: {
        en: "Cursed files, haunted apps, and AI gone wrong.",
        ru: "Проклятые файлы, одержимые приложения и ИИ.",
        pt: "Arquivos amaldiçoados, apps assombrados e IA.",
        de: "Verfluchte Dateien, Apps und künstliche Intelligenz.",
        es: "Archivos malditos, apps embrujadas e IA.",
      },
    },
  ],
};
