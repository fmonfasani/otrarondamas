/**
 * Minimal shape consumed by DossierService.uploadDocument.
 * Kept structural so controllers do not depend on Express namespace
 * augmentation supplied by a particular @types/multer version.
 */
export interface UploadedDossierFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}
