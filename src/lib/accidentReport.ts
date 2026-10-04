import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { accidentReportHtml, type Accident, type ReportCar } from './accident';
import { namedPdf } from './accidentFiles';
import { photoDataUri } from './accidentPhotos';

/** Vytvoří PDF podklad k nehodě a otevře nabídku, kam ho poslat (e-mail, WhatsApp, pojišťovna). */
export async function shareAccidentReport(accident: Accident, myCar: ReportCar | undefined): Promise<void> {
  const images: Record<string, string> = {};
  for (const photo of accident.photos) {
    try {
      images[photo.id] = await photoDataUri(photo.uri);
    } catch {
      // Fotku, kterou už nejde načíst, v PDF vynecháme.
    }
  }
  const html = accidentReportHtml(accident, myCar, images);
  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }
  // A4 v bodech.
  const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 });
  const d = new Date(accident.startedAt);
  const file = namedPdf(uri, `nehoda-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.pdf`);
  if (!(await Sharing.isAvailableAsync())) throw new Error('sharing-unavailable');
  await Sharing.shareAsync(file, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Poslat podklad k nehodě' });
}

/** Pošle jednu fotku, třeba pojišťovně v plném rozlišení. */
export async function sharePhoto(uri: string): Promise<void> {
  if (Platform.OS === 'web' || !(await Sharing.isAvailableAsync())) return;
  await Sharing.shareAsync(uri, { mimeType: 'image/jpeg', UTI: 'public.jpeg', dialogTitle: 'Poslat fotku' });
}
