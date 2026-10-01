// Beelden als bestanden op de telefoon (niet in AsyncStorage, dat is daar te klein voor).
import { Directory, File, Paths } from 'expo-file-system';

const DIR = 'frpg-beelden';

function ext(mime: string): string {
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  return 'jpg';
}

/** Schrijft het beeld weg en geeft de file://-uri terug. Elke poging krijgt een eigen naam (geen oude cache). */
export function savePicture(id: string, base64: string, mime: string): string {
  const dir = new Directory(Paths.document, DIR);
  dir.create({ idempotent: true, intermediates: true });
  const file = new File(Paths.document, DIR, `${id}-${Date.now()}.${ext(mime)}`);
  file.create({ overwrite: true });
  file.write(base64, { encoding: 'base64' });
  return file.uri;
}

/** Verwijdert beeldbestanden (bij een nieuwe poging of als je een avontuur weggooit). */
export function deletePictures(uris: (string | undefined)[]): void {
  for (const uri of uris) {
    if (!uri) continue;
    try {
      const f = new File(uri);
      if (f.exists) f.delete();
    } catch {
      /* al weg */
    }
  }
}
