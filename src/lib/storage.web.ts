// Na webu (náhled v prohlížeči) stačí localStorage.
export async function loadJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function saveJson(key: string, value: unknown): Promise<void> {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Soukromé okno nebo zablokované úložiště: data vydrží jen do zavření.
  }
}
