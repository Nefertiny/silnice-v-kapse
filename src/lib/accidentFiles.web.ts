// V prohlížeči fotky zůstávají jen do zavření stránky, náhled appky to nepotřebuje víc.
export function keepPhoto(uri: string): string {
  return uri;
}

export function deletePhotos(_uris: string[]): void {}

export function namedPdf(uri: string, _name: string): string {
  return uri;
}
