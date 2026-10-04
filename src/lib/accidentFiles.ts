import { Directory, File, Paths } from 'expo-file-system';

function folder(): Directory {
  const dir = new Directory(Paths.document, 'nehoda');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

/** Fotka z fotoaparátu leží v mezipaměti, kterou systém může smazat. Proto ji kopírujeme k appce. */
export function keepPhoto(uri: string): string {
  const target = new File(folder(), `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`);
  new File(uri).copySync(target);
  return target.uri;
}

export function deletePhotos(uris: string[]): void {
  for (const uri of uris) {
    try {
      const file = new File(uri);
      if (file.exists) file.delete();
    } catch {
      // Soubor už není, nevadí.
    }
  }
}

/** PDF z tisku má náhodné jméno. Před odesláním ho přejmenujeme, ať ho pojišťovna pozná. */
export function namedPdf(uri: string, name: string): string {
  const target = new File(Paths.cache, name);
  new File(uri).moveSync(target, { overwrite: true });
  return target.uri;
}
