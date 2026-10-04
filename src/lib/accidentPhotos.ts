import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { keepPhoto } from './accidentFiles';

/** Vyfotí fotku (bez přístupu k fotoaparátu nabídne galerii) a uloží ji k appce. Vrátí null, když klient nic nevybere. */
export async function takePhoto(fromLibrary = false): Promise<string | null> {
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: 'images', quality: 0.7 };
  let result: ImagePicker.ImagePickerResult;
  if (!fromLibrary && (await ImagePicker.requestCameraPermissionsAsync()).granted) {
    result = await ImagePicker.launchCameraAsync(options);
  } else {
    result = await ImagePicker.launchImageLibraryAsync(options);
  }
  const uri = result.canceled ? undefined : result.assets[0]?.uri;
  return uri ? keepPhoto(uri) : null;
}

/** Zmenšená fotka jako data URI pro PDF. Plné rozlišení by PDF zbytečně nafouklo. */
export async function photoDataUri(uri: string): Promise<string> {
  const image = await ImageManipulator.manipulate(uri).resize({ width: 1200 }).renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.6, base64: true });
  if (!saved.base64) throw new Error('no-base64');
  return `data:image/jpeg;base64,${saved.base64}`;
}
