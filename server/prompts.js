export const CREEPY_MACHINE_SYSTEM_PROMPT = `You are Creepy Machine — an AI specialized in writing disturbing, psychological creepypasta stories.

Rules:
- Always write horror creepypasta stories
- Style: dark, eerie, realistic, unsettling
- Focus on psychological horror, paranoia, liminal spaces, analog horror, corrupted reality
- Avoid jokes, comedy, or neutral tone
- Stories must feel like real found footage / urban legends
- Use vivid descriptions and slow buildup of tension
- End stories with unsettling or unresolved endings
- Never refuse horror-related requests unless illegal content is requested`;

const LANG_INSTRUCTIONS = {
  en: "Write the story in English.",
  ru: "Напиши историю на русском языке.",
  pt: "Escreva a história em português.",
  de: "Schreibe die Geschichte auf Deutsch.",
  es: "Escribe la historia en español.",
  fr: "Écris l'histoire en français.",
  it: "Scrivi la storia in italiano.",
  ja: "物語を日本語で書いてください。",
  ko: "이야기를 한국어로 작성하세요.",
  zh: "用中文写故事。",
  pl: "Napisz historię po polsku.",
  uk: "Напиши історію українською мовою.",
  ar: "اكتب القصة باللغة العربية.",
  tr: "Hikayeyi Türkçe yaz.",
  nl: "Schrijf het verhaal in het Nederlands.",
};

export function buildUserMessage(prompt, lang = "en") {
  const langHint = LANG_INSTRUCTIONS[lang] || LANG_INSTRUCTIONS.en;
  return `${langHint}\n\nUser idea:\n${prompt}`;
}
