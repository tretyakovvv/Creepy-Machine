(function () {
  const extraFandoms = [
    { id: "bendy", icon: "🖋", promptHint: "Bendy and the Ink Machine, cartoon studio, ink demons", names: { en: "Bendy", ru: "Bendy" }, desc: { en: "Cartoon studio swallowed by ink.", ru: "Студия мультфильмов, поглощённая чернилами." } },
    { id: "pony-hr", icon: "🐴", promptHint: "My Little Pony creepypasta, Luna, corrupted friendship", names: { en: "MLP Horror", ru: "MLP-ужасы" }, desc: { en: "Corrupted pastel nightmares.", ru: "Искажённые пастельные кошмары." } },
    { id: "sonic-exe", icon: "💙", promptHint: "Sonic.exe, corrupted game cartridge, I AM GOD", names: { en: "Sonic.exe", ru: "Sonic.exe" }, desc: { en: "Cursed platformer ROM.", ru: "Проклятый картридж." } },
    { id: "marble-hornets", icon: "📼", promptHint: "Marble Hornets, totheark, Operator, video series", names: { en: "Marble Hornets", ru: "Marble Hornets" }, desc: { en: "Found-footage Slender series.", ru: "Найденные записи о Слендере." } },
    { id: "candle-cove", icon: "📺", promptHint: "Candle Cove, pirate show, tooth monsters", names: { en: "Candle Cove", ru: "Candle Cove" }, desc: { en: "Children's show that wasn't for children.", ru: "Детское шоу не для детей." } },
    { id: "petscop", icon: "🎮", promptHint: "Petscop, PlayStation, Garalina, rebirthing", names: { en: "Petscop", ru: "Petscop" }, desc: { en: "Incomplete game with buried secrets.", ru: "Незавершённая игра с тайнами." } },
    { id: "local58", icon: "📡", promptHint: "Local58, emergency broadcast, moon, analog TV", names: { en: "Local58", ru: "Local58" }, desc: { en: "Analog broadcast horror.", ru: "Аналоговый ТВ-ужас." } },
    { id: "mandela-catalog", icon: "📂", promptHint: "Mandela Catalogue, alternates, doppelgangers", names: { en: "Mandela Catalogue", ru: "Mandela Catalogue" }, desc: { en: "They are not human anymore.", ru: "Они больше не люди." } },
    { id: "walten-files", icon: "🎪", promptHint: "The Walten Files, mascots, Bon, corporate horror", names: { en: "Walten Files", ru: "Walten Files" }, desc: { en: "Corporate mascot tragedy.", ru: "Корпоративный ужас маскотов." } },
    { id: "resident-evil", icon: "☣", promptHint: "Resident Evil, bioweapons, mansion, zombies", names: { en: "Bio Horror", ru: "Биоужас" }, desc: { en: "Outbreak and bioweapons.", ru: "Вспышки и биооружие." } },
    { id: "silent-hill", icon: "🌫", promptHint: "Silent Hill, fog, psychological guilt, monsters", names: { en: "Silent Hill", ru: "Silent Hill" }, desc: { en: "Town that manifests guilt.", ru: "Город, manifestирующий вину." } },
    { id: "lovecraft", icon: "🐙", promptHint: "Lovecraft, Cthulhu, Innsmouth, cosmic entities", names: { en: "Lovecraftian", ru: "Лавкрафт" }, desc: { en: "Cosmic entities beyond sanity.", ru: "Сущности за гранью разума." } },
    { id: "junji-ito", icon: "🌀", promptHint: "Junji Ito style, spirals, body horror, obsession", names: { en: "Junji Ito", ru: "Дзюндзи Ито" }, desc: { en: "Obsessive body horror manga.", ru: "Одержимость и телесный ужас." } },
    { id: "creepypasta-games", icon: "👾", promptHint: "Ib, Mad Father, Corpse Party, indie horror RPG", names: { en: "Indie Horror RPG", ru: "Инди-хоррор RPG" }, desc: { en: "Pixel nightmares and wrong worlds.", ru: "Пиксельные кошмары." } },
    { id: "roblox-horror", icon: "🟥", promptHint: "Roblox horror games, Doors, Rainbow Friends", names: { en: "Roblox Horror", ru: "Roblox-ужасы" }, desc: { en: "Kids' platform, adult fears.", ru: "Детская платформа, взрослые страхи." } },
    { id: "vtuber-horror", icon: "🎭", promptHint: "VTuber horror, corrupted stream, chat logs", names: { en: "Streamer Horror", ru: "Стример-ужас" }, desc: { en: "Live stream gone wrong.", ru: "Эфир, пошедший не так." } },
    { id: "true-crime", icon: "🔍", promptHint: "True crime style creepypasta, unsolved, documentary", names: { en: "Pseudo Documentary", ru: "Псевдодокументалка" }, desc: { en: "Fake documentaries and cold cases.", ru: "Фальшивые расследования." } },
  ];

  const extraGenres = [
    { id: "body-horror", icon: "🫀", tags: ["mutation", "flesh", "transformation"], names: { en: "Body Horror", ru: "Боди-хоррор" }, desc: { en: "Flesh that should not move.", ru: "Плоть, которая не должна двигаться." } },
    { id: "folk-horror", icon: "🌾", tags: ["ritual", "village", "pagan"], names: { en: "Folk Horror", ru: "Фолк-хоррор" }, desc: { en: "Ancient rituals in quiet places.", ru: "Древние ритуалы в тихих местах." } },
    { id: "ghost", icon: "👻", tags: ["haunting", "spirit", "afterlife"], names: { en: "Ghost / Haunting", ru: "Призраки" }, desc: { en: "Something stayed behind.", ru: "Что-то осталось." } },
    { id: "slasher", icon: "🩸", tags: ["killer", "stalking", "final girl"], names: { en: "Slasher", ru: "Слэшер" }, desc: { en: "Stalking and survival.", ru: "Преследование и выживание." } },
    { id: "occult", icon: "⛧", tags: ["ritual", "demon", "cult"], names: { en: "Occult", ru: "Оккультизм" }, desc: { en: "Summoning what answers.", ru: "Призыв того, кто ответит." } },
    { id: "post-apocalyptic", icon: "☢", tags: ["wasteland", "survivors", "ruins"], names: { en: "Post-Apocalyptic", ru: "Постапокалипсис" }, desc: { en: "World after the end.", ru: "Мир после конца." } },
    { id: "dream-logic", icon: "💤", tags: ["surreal", "nightmare", "unreality"], names: { en: "Dream Logic", ru: "Логика сна" }, desc: { en: "Reality bends like sleep.", ru: "Реальность гнётся как сон." } },
    { id: "medical", icon: "🏥", tags: ["hospital", "experiment", "quarantine"], names: { en: "Medical Horror", ru: "Медицинский" }, desc: { en: "Sterile halls, wrong cures.", ru: "Стерильные коридоры." } },
    { id: "religious", icon: "✝", tags: ["faith", "possession", "sin"], names: { en: "Religious Horror", ru: "Религиозный" }, desc: { en: "Faith twisted into dread.", ru: "Вера, ставшая ужасом." } },
    { id: "children", icon: "🧸", tags: ["innocence corrupted", "playground"], names: { en: "Corrupted Innocence", ru: "Искажённая невинность" }, desc: { en: "Childhood turned wrong.", ru: "Детство пошло не так." } },
    { id: "internet-mystery", icon: "🌐", tags: ["ARG", "cicada", "deep web"], names: { en: "Internet Mystery", ru: "Интернет-тайна" }, desc: { en: "Rabbits holes online.", ru: "Кроличьи норы в сети." } },
    { id: "time-loop", icon: "🔁", tags: ["repeat", "déjà vu", "stuck"], names: { en: "Time Loop", ru: "Петля времени" }, desc: { en: "The same day, worse each time.", ru: "Тот же день, хуже с каждым разом." } },
    { id: "monster", icon: "🐺", tags: ["creature", "transformation", "hunt"], names: { en: "Monster Horror", ru: "Монстры" }, desc: { en: "Something hunts in the dark.", ru: "Что-то охотится во мраке." } },
    { id: "isolation", icon: "🏚", tags: ["alone", "cabin", "snow"], names: { en: "Isolation", ru: "Изоляция" }, desc: { en: "Alone where no one hears.", ru: "Один, где никто не услышит." } },
    { id: "meta-horror", icon: "🪞", tags: ["fourth wall", "reader", "story aware"], names: { en: "Meta Horror", ru: "Мета-хоррор" }, desc: { en: "The story knows you're reading.", ru: "История знает, что ты читаешь." } },
  ];

  const existingIds = new Set(window.CM_CONFIG.fandoms.map((f) => f.id));
  for (const f of extraFandoms) {
    if (!existingIds.has(f.id)) window.CM_CONFIG.fandoms.push(f);
  }

  const genreIds = new Set(window.CM_CONFIG.genres.map((g) => g.id));
  for (const g of extraGenres) {
    if (!genreIds.has(g.id)) window.CM_CONFIG.genres.push(g);
  }
})();
