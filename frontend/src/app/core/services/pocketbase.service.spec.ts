import { TestBed } from '@angular/core/testing';
import { ClientResponseError } from 'pocketbase';
import { beforeEach, describe, expect, it } from 'vitest';
import { PocketBaseService, POCKETBASE_URL } from './pocketbase.service';

describe('PocketBaseService', () => {
  let service: PocketBaseService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PocketBaseService,
        { provide: POCKETBASE_URL, useValue: 'http://localhost:8090' }
      ]
    });
    service = TestBed.inject(PocketBaseService);
  });

  it('should be created and expose pb instance', () => {
    expect(service).toBeTruthy();
    expect(service.pb).toBeDefined();
    expect(service.pb.baseUrl).toBe('http://localhost:8090');
  });

  it('should generate file URLs correctly', () => {
    const record = { id: 'rec123', collectionName: 'inventario' };
    const url = service.getFileUrl(record, 'photo.jpg');
    expect(url).toContain('/api/files/inventario/rec123/photo.jpg');

    const emptyUrl = service.getFileUrl(record, '');
    expect(emptyUrl).toBe('');
  });

  describe('getErrorMessage', () => {
    it('should return cancel message when isAbort is true', () => {
      const err = new ClientResponseError({ isAbort: true });
      expect(service.getErrorMessage(err)).toBe('La solicitud fue cancelada.');
    });

    it('should return response.message if present', () => {
      const err = new ClientResponseError({
        response: { message: 'Mensaje del backend' }
      });
      expect(service.getErrorMessage(err)).toBe('Mensaje del backend');
    });

    it('should return message from Error instance', () => {
      const err = new Error('Error general');
      expect(service.getErrorMessage(err)).toBe('Error general');
    });

    it('should return fallback message for unknown error', () => {
      expect(service.getErrorMessage(null)).toBe(
        'Ha ocurrido un error inesperado al conectar con el servidor.'
      );
    });
  });
});
