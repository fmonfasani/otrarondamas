import * as path from 'node:path';
import { photoPath, photoStorageDir, reorder, sniffPhoto } from './product-photos';

describe('product photos (OR-B4-046 rule 12)', () => {
  it('takes JPG, PNG and WebP by their first bytes, and nothing else', () => {
    expect(sniffPhoto(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toEqual({
      mimeType: 'image/jpeg',
      ext: 'jpg',
    });
    expect(sniffPhoto(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))?.ext).toBe(
      'png',
    );
    expect(sniffPhoto(Buffer.from('RIFF0000WEBPVP8 '))?.ext).toBe('webp');
    expect(sniffPhoto(Buffer.from('%PDF-1.7'))).toBeNull();
    expect(sniffPhoto(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeNull();
  });

  it('keeps the photos in their own folder, or inside the chat files volume', () => {
    expect(
      photoStorageDir({
        CATALOG_STORAGE_DIR: '/data/catalogo',
        MESSAGING_STORAGE_DIR: '/data/mensajes',
      }),
    ).toBe('/data/catalogo');
    expect(photoStorageDir({ MESSAGING_STORAGE_DIR: '/data/mensajes' })).toBe(
      path.join('/data/mensajes', 'catalogo'),
    );
    expect(photoStorageDir({})).toBeNull();
  });

  it('never resolves a key outside the folder', () => {
    const dir = path.resolve('fotos');
    expect(photoPath(dir, 'b1/f1.jpg')).toBe(path.join(dir, 'b1', 'f1.jpg'));
    expect(photoPath(dir, '../secreto.txt')).toBeNull();
    expect(photoPath(dir, path.resolve('/etc/passwd'))).toBeNull();
  });

  it('puts the chosen photos first and keeps the rest', () => {
    expect(reorder(['a', 'b', 'c'], ['c'])).toEqual(['c', 'a', 'b']);
    expect(reorder(['a', 'b', 'c'], ['b', 'x', 'b', 'a'])).toEqual(['b', 'a', 'c']);
    expect(reorder(['a'], [])).toEqual(['a']);
  });
});
