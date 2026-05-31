(function () {
  const extra = {
    fr: {
      meta: { title: "Creepy Machine — Générateur de creepypasta IA" },
      nav: { home: "Accueil", fandoms: "Fandoms", genres: "Genres", subscription: "Abonnement", privacy: "Confidentialité", terms: "Conditions", admin: "Admin" },
      auth: { signIn: "Connexion Google", signOut: "Déconnexion", greeting: "Bonjour, {name}", required: "Connectez-vous avec Google.", failed: "Échec de connexion.", setupHint: "Configurez GOOGLE_CLIENT_ID" },
      hero: { title: "CREEPY MACHINE", subtitle: "Entrez votre cauchemar. La machine l'écrira." },
      generator: { label: "Votre idée", placeholder: "Décrivez votre creepypasta...", generate: "Générer", loading: "La machine réfléchit...", resultTitle: "Transmission reçue", warningEmpty: "Décrivez d'abord votre cauchemar.", warningError: "La machine est silencieuse.", subscriptionRequired: "Limite atteinte. Abonnez-vous.", useHint: "Ctrl/Cmd + Entrée" },
      fandoms: { title: "Fandoms populaires", subtitle: "Cliquez pour inspirer votre prompt" },
      genres: { title: "Genres populaires", subtitle: "Choisissez le ton" },
      subscription: { title: "Ouvrez l'abîme", subtitle: "Plus de générations, service prioritaire, styles exclusifs", free: "Gratuit", perMonth: "/ mois", generations: "{n} générations / mois", subscribe: "S'abonner", currentPlan: "Votre plan", popular: "Populaire", paymentNote: "Paiement YooKassa", success: "Paiement réussi.", pending: "En attente..." },
      footer: { copyright: "© {year} Creepy Machine", ai: "Contenu généré par IA.", madeWith: "Forgé dans l'ombre." },
      themes: { midnight: "Minuit", blood: "Lune de sang", pale: "Horreur pâle", void: "Vide", ember: "Braise", toxic: "Toxique", frost: "Givre" },
      plans: { nightmare: { name: "Cauchemar", desc: "Pour auteurs occasionnels" }, abyss: { name: "Abîme", desc: "Ténèbres illimitées" } },
    },
    it: {
      meta: { title: "Creepy Machine — Generatore creepypasta IA" },
      nav: { home: "Home", fandoms: "Fandom", genres: "Generi", subscription: "Abbonamento", privacy: "Privacy", terms: "Termini", admin: "Admin" },
      auth: { signIn: "Accedi con Google", signOut: "Esci", greeting: "Ciao, {name}", required: "Accedi con Google per generare.", failed: "Accesso fallito.", setupHint: "Imposta GOOGLE_CLIENT_ID" },
      hero: { title: "CREEPY MACHINE", subtitle: "Inserisci l'incubo. La macchina lo scriverà." },
      generator: { label: "La tua idea", placeholder: "Descrivi la creepypasta...", generate: "Genera", loading: "La macchina pensa...", resultTitle: "Trasmissione ricevuta", warningEmpty: "Descrivi prima l'incubo.", warningError: "La macchina è silenziosa.", subscriptionRequired: "Limite raggiunto.", useHint: "Ctrl/Cmd + Invio" },
      fandoms: { title: "Fandom popolari", subtitle: "Clicca per ispirare il prompt" },
      genres: { title: "Generi popolari", subtitle: "Scegli il tono" },
      subscription: { title: "Sblocca l'abisso", subtitle: "Più generazioni, servizio prioritario, stili esclusivi", subscribe: "Abbonati", currentPlan: "Il tuo piano", popular: "Popolare", perMonth: "/ mese", generations: "{n} generazioni / mese", paymentNote: "Pagamenti YooKassa", success: "Pagamento riuscito.", pending: "In attesa...", free: "Gratis" },
      footer: { copyright: "© {year} Creepy Machine", ai: "Contenuto generato con IA.", madeWith: "Creato nel buio." },
      themes: { midnight: "Mezzanotte", blood: "Luna di sangue", pale: "Horror pallido", void: "Vuoto", ember: "Brace", toxic: "Tossico", frost: "Gelo" },
      plans: { nightmare: { name: "Incubo", desc: "Per scrittori occasionali" }, abyss: { name: "Abisso", desc: "Oscurità illimitata" } },
    },
    ja: {
      meta: { title: "Creepy Machine — AIクリーピーパスタ" },
      nav: { home: "ホーム", fandoms: "ファンダム", genres: "ジャンル", subscription: "サブスク", privacy: "プライバシー", terms: "利用規約", admin: "管理" },
      auth: { signIn: "Googleでログイン", signOut: "ログアウト", greeting: "こんにちは、{name}", required: "Googleでログインしてください。", failed: "ログイン失敗。", setupHint: "GOOGLE_CLIENT_IDを設定" },
      hero: { title: "CREEPY MACHINE", subtitle: "悪夢を入力。機械が書く。" },
      generator: { label: "アイデア", placeholder: "クリーピーパスタのアイデア...", generate: "生成", loading: "思考中...", resultTitle: "受信完了", warningEmpty: "まず悪夢を描写してください。", warningError: "接続エラー。", subscriptionRequired: "上限に達しました。", useHint: "Ctrl/Cmd + Enter" },
      fandoms: { title: "人気ファンダム", subtitle: "カードをクリック" },
      genres: { title: "人気ジャンル", subtitle: "トーンを選択" },
      subscription: { title: "深淵を解放", subtitle: "より多くの生成、優先対応、限定スタイル", subscribe: "登録", currentPlan: "現在のプラン", popular: "人気", perMonth: "/ 月", generations: "{n} 回/月", paymentNote: "YooKassa", success: "支払い成功。", pending: "処理中...", free: "無料" },
      footer: { copyright: "© {year} Creepy Machine", ai: "AI生成コンテンツ。", madeWith: "闇で作られた。" },
      themes: { midnight: "真夜中", blood: "血の月", pale: "蒼白", void: "虚無", ember: "残り火", toxic: "毒", frost: "霜" },
      plans: { nightmare: { name: "悪夢", desc: "カジュアル向け" }, abyss: { name: "深淵", desc: "無限の闇" } },
    },
    ko: {
      meta: { title: "Creepy Machine — AI 크리피파스타" },
      nav: { home: "홈", fandoms: "팬덤", genres: "장르", subscription: "구독", privacy: "개인정보", terms: "약관", admin: "관리" },
      auth: { signIn: "Google 로그인", signOut: "로그아웃", greeting: "안녕, {name}", required: "Google 로그인이 필요합니다.", failed: "로그인 실패.", setupHint: "GOOGLE_CLIENT_ID 설정" },
      hero: { title: "CREEPY MACHINE", subtitle: "악몽을 입력하세요. 기계가 씁니다." },
      generator: { label: "아이디어", placeholder: "크리피파스타 아이디어...", generate: "생성", loading: "생각 중...", resultTitle: "수신 완료", warningEmpty: "먼저 악몽을 설명하세요.", warningError: "연결 오류.", subscriptionRequired: "한도 도달.", useHint: "Ctrl/Cmd + Enter" },
      fandoms: { title: "인기 팬덤", subtitle: "카드 클릭" },
      genres: { title: "인기 장르", subtitle: "톤 선택" },
      subscription: { title: "심연 해제", subtitle: "더 많은 생성, 우선 서비스, 전용 스타일", subscribe: "구독", currentPlan: "현재 플랜", popular: "인기", perMonth: "/ 월", generations: "{n}회/월", paymentNote: "YooKassa", success: "결제 성공.", pending: "대기 중...", free: "무료" },
      footer: { copyright: "© {year} Creepy Machine", ai: "AI 생성 콘텐츠.", madeWith: "어둠 속에서." },
      themes: { midnight: "한밤", blood: "핏빛 달", pale: "창백", void: "공허", ember: "잔불", toxic: "독", frost: "서리" },
      plans: { nightmare: { name: "악몽", desc: "캐주얼" }, abyss: { name: "심연", desc: "무한한 어둠" } },
    },
    zh: {
      meta: { title: "Creepy Machine — AI恐怖故事" },
      nav: { home: "首页", fandoms: "同人", genres: "类型", subscription: "订阅", privacy: "隐私", terms: "条款", admin: "管理" },
      auth: { signIn: "Google登录", signOut: "退出", greeting: "你好，{name}", required: "请用Google登录。", failed: "登录失败。", setupHint: "设置GOOGLE_CLIENT_ID" },
      hero: { title: "CREEPY MACHINE", subtitle: "输入噩梦，机器为你书写。" },
      generator: { label: "你的想法", placeholder: "描述恐怖故事...", generate: "生成", loading: "思考中...", resultTitle: "已接收", warningEmpty: "请先描述噩梦。", warningError: "连接失败。", subscriptionRequired: "已达上限。", useHint: "Ctrl/Cmd + Enter" },
      fandoms: { title: "热门同人", subtitle: "点击卡片" },
      genres: { title: "热门类型", subtitle: "选择风格" },
      subscription: { title: "解锁深渊", subtitle: "更多生成，优先服务，专属风格", subscribe: "订阅", currentPlan: "当前方案", popular: "热门", perMonth: "/ 月", generations: "{n}次/月", paymentNote: "YooKassa", success: "支付成功。", pending: "处理中...", free: "免费" },
      footer: { copyright: "© {year} Creepy Machine", ai: "AI生成内容。", madeWith: "诞生于黑暗。" },
      themes: { midnight: "午夜", blood: "血月", pale: "苍白", void: "虚空", ember: "余烬", toxic: "剧毒", frost: "霜冻" },
      plans: { nightmare: { name: "噩梦", desc: "休闲作者" }, abyss: { name: "深渊", desc: "无限黑暗" } },
    },
    pl: {
      meta: { title: "Creepy Machine — Generator creepypasty AI" },
      nav: { home: "Start", fandoms: "Fandomy", genres: "Gatunki", subscription: "Subskrypcja", privacy: "Prywatność", terms: "Regulamin", admin: "Admin" },
      auth: { signIn: "Zaloguj przez Google", signOut: "Wyloguj", greeting: "Cześć, {name}", required: "Zaloguj się przez Google.", failed: "Błąd logowania.", setupHint: "Ustaw GOOGLE_CLIENT_ID" },
      hero: { title: "CREEPY MACHINE", subtitle: "Wpisz koszmar. Maszyna go napisze." },
      generator: { label: "Twój pomysł", placeholder: "Opisz creepypastę...", generate: "Generuj", loading: "Maszyna myśli...", resultTitle: "Odebrano", warningEmpty: "Najpierw opisz koszmar.", warningError: "Błąd połączenia.", subscriptionRequired: "Limit wyczerpany.", useHint: "Ctrl/Cmd + Enter" },
      themes: { midnight: "Północ", blood: "Księżyc krwi", pale: "Blady horror", void: "Pustka", ember: "Žar", toxic: "Toksyczny", frost: "Mróz" },
    },
    uk: {
      meta: { title: "Creepy Machine — генератор крипіпаст" },
      nav: { home: "Головна", fandoms: "Фандоми", genres: "Жанри", subscription: "Підписка", privacy: "Конфіденційність", terms: "Умови", admin: "Адмін" },
      auth: { signIn: "Увійти через Google", signOut: "Вийти", greeting: "Привіт, {name}", required: "Увійдіть через Google.", failed: "Помилка входу.", setupHint: "GOOGLE_CLIENT_ID у .env" },
      hero: { title: "CREEPY MACHINE", subtitle: "Введи свій кошмар. Машина напише його." },
      generator: { label: "Твоя ідея", placeholder: "Опиши крипіпасту...", generate: "Згенерувати", loading: "Машина думає...", resultTitle: "Передачу отримано", warningEmpty: "Спочатку опиши кошмар.", warningError: "Машина замовкла.", subscriptionRequired: "Ліміт вичерпано.", useHint: "Ctrl/Cmd + Enter" },
      themes: { midnight: "Північ", blood: "Кривавий місяць", pale: "Блідий жах", void: "Порожнеча", ember: "Вугілля", toxic: "Токсин", frost: "Мороз" },
    },
    ar: {
      meta: { title: "Creepy Machine — مولد قصص الرعب" },
      nav: { home: "الرئيسية", fandoms: "الفاندوم", genres: "الأنواع", subscription: "اشتراك", privacy: "الخصوصية", terms: "الشروط", admin: "إدارة" },
      auth: { signIn: "تسجيل Google", signOut: "خروج", greeting: "مرحباً {name}", required: "سجّل الدخول عبر Google.", failed: "فشل تسجيل الدخول.", setupHint: "اضبط GOOGLE_CLIENT_ID" },
      hero: { title: "CREEPY MACHINE", subtitle: "أدخل كابوسك. الآلة ستكتبه." },
      generator: { label: "فكرتك", placeholder: "صف فكرتك...", generate: "توليد", loading: "تفكير...", resultTitle: "تم الاستلام", warningEmpty: "صف الكابوس أولاً.", warningError: "خطأ في الاتصال.", subscriptionRequired: "تم الوصول للحد.", useHint: "Ctrl/Cmd + Enter" },
      themes: { midnight: "منتصف الليل", blood: "قمر الدم", pale: "رعب شاحب", void: "فراغ", ember: "جمر", toxic: "سام", frost: "صقيع" },
    },
    tr: {
      meta: { title: "Creepy Machine — AI korku hikayesi" },
      nav: { home: "Ana", fandoms: "Fandom", genres: "Türler", subscription: "Abonelik", privacy: "Gizlilik", terms: "Şartlar", admin: "Admin" },
      auth: { signIn: "Google ile giriş", signOut: "Çıkış", greeting: "Merhaba, {name}", required: "Google ile giriş yapın.", failed: "Giriş başarısız.", setupHint: "GOOGLE_CLIENT_ID ayarlayın" },
      hero: { title: "CREEPY MACHINE", subtitle: "Kabusunu gir. Makine yazacak." },
      generator: { generate: "Üret", loading: "Düşünüyor...", placeholder: "Fikrini anlat...", label: "Fikrin", warningEmpty: "Önce kabusunu anlat.", warningError: "Bağlantı hatası.", subscriptionRequired: "Limit doldu.", useHint: "Ctrl/Cmd + Enter", resultTitle: "Alındı" },
      themes: { midnight: "Gece", blood: "Kan ayı", pale: "Soluk", void: "Boşluk", ember: "Köz", toxic: "Zehir", frost: "Don" },
    },
    nl: {
      meta: { title: "Creepy Machine — AI creepypasta" },
      nav: { home: "Home", fandoms: "Fandoms", genres: "Genres", subscription: "Abonnement", privacy: "Privacy", terms: "Voorwaarden", admin: "Admin" },
      auth: { signIn: "Google login", signOut: "Uitloggen", greeting: "Hallo, {name}", required: "Log in met Google.", failed: "Login mislukt.", setupHint: "Stel GOOGLE_CLIENT_ID in" },
      hero: { title: "CREEPY MACHINE", subtitle: "Voer je nachtmerrie in." },
      generator: { generate: "Genereren", loading: "Denkt na...", placeholder: "Beschrijf je idee...", label: "Je idee", warningEmpty: "Beschrijf eerst je nachtmerrie.", warningError: "Verbindingsfout.", subscriptionRequired: "Limiet bereikt.", useHint: "Ctrl/Cmd + Enter", resultTitle: "Ontvangen" },
      themes: { midnight: "Middernacht", blood: "Bloedmaan", pale: "Bleek", void: "Leegte", ember: "Gloed", toxic: "Giftig", frost: "vorst" },
    },
  };

  function deepMerge(a, b) {
    const out = { ...a };
    for (const k of Object.keys(b)) {
      if (b[k] && typeof b[k] === "object" && !Array.isArray(b[k]) && a[k]) {
        out[k] = deepMerge(a[k], b[k]);
      } else {
        out[k] = b[k];
      }
    }
    return out;
  }

  for (const [lang, pack] of Object.entries(extra)) {
    window.CMI18n.translations[lang] = deepMerge(
      window.CMI18n.translations[lang] || {},
      pack
    );
  }
})();
