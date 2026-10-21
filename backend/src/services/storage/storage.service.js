import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const storageRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../storage'
);

const resolveObjectPath = (objectKey) => {
  if (typeof objectKey !== 'string' || objectKey.length === 0) {
    throw new TypeError('La clave del archivo no es válida');
  }

  const filePath = resolve(storageRoot, objectKey);
  const pathFromRoot = relative(storageRoot, filePath);

  if (
    !pathFromRoot ||
    pathFromRoot === '..' ||
    pathFromRoot.startsWith(`..${sep}`) ||
    isAbsolute(pathFromRoot)
  ) {
    throw new TypeError('La clave del archivo no es válida');
  }

  return filePath;
};

export const uploadFile = async ({ objectKey, buffer }) => {
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError('El contenido del archivo debe ser un Buffer');
  }

  const filePath = resolveObjectPath(objectKey);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, buffer);
};

export const getFile = async (objectKey) => {
  const filePath = resolveObjectPath(objectKey);
  const buffer = await readFile(filePath);

  return { buffer };
};

export const deleteFile = async (objectKey) => {
  const filePath = resolveObjectPath(objectKey);
  await rm(filePath, { force: true });
};
