import { Injectable, InjectionToken, inject } from '@angular/core';
import PocketBase, { ClientResponseError } from 'pocketbase';
import { environment } from '../../../environments/environment';

export const POCKETBASE_URL = new InjectionToken<string>('POCKETBASE_URL', {
  providedIn: 'root',
  factory: () => environment.pocketbaseUrl,
});

@Injectable({
  providedIn: 'root',
})
export class PocketBaseService {
  private readonly _pb: PocketBase;

  constructor() {
    const customUrl = inject(POCKETBASE_URL, { optional: true });
    this._pb = new PocketBase(customUrl || environment.pocketbaseUrl);
  }

  /**
   * Instancia única del cliente PocketBase SDK.
   */
  get pb(): PocketBase {
    return this._pb;
  }

  /**
   * Genera la URL pública o protegida para un archivo adjunto en PocketBase.
   */
  getFileUrl(
    record: { id: string; collectionId?: string; collectionName?: string },
    filename: string,
    queryParams?: { [key: string]: any }
  ): string {
    if (!filename) {
      return '';
    }
    return this._pb.files.getURL(record, filename, queryParams);
  }

  /**
   * Extrae un mensaje de error legible a partir de un error arrojado por PocketBase.
   */
  getErrorMessage(error: unknown): string {
    if (error instanceof ClientResponseError) {
      if (error.isAbort) {
        return 'La solicitud fue cancelada.';
      }
      if (error.response?.['message']) {
        return error.response['message'];
      }
      if (error.message) {
        return error.message;
      }
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Ha ocurrido un error inesperado al conectar con el servidor.';
  }
}
