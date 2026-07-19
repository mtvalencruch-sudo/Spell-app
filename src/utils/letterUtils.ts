export function isVowel(char: string): boolean {
  if (!char) return false;
  const c = char.toLowerCase();
  // Include common accented vowels (Spanish: á, é, í, ó, ú, ü, etc.)
  return ["a", "e", "i", "o", "u", "á", "é", "í", "ó", "ú", "ü", "à", "è", "ì", "ò", "ù", "ä", "ë", "ï", "ö", "â", "ê", "î", "ô", "û"].includes(c);
}

export function isConsonant(char: string): boolean {
  if (!char) return false;
  const c = char.toLowerCase();
  // Use Unicode property escape to match any single letter across scripts, and make sure it's not a vowel
  return /^\p{L}$/u.test(c) && !isVowel(c);
}

export function getLetterType(char: string): "vowel" | "consonant" | "other" {
  if (isVowel(char)) return "vowel";
  if (isConsonant(char)) return "consonant";
  return "other";
}

