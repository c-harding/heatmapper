import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname } from 'path';
import lockfile from 'proper-lockfile';

/**
 * Lock a file and update its contents.
 *
 * The second overload allows a more specific type to be inferred for the new value of the file.
 */
export async function updateFile<T>(
  file: string,
  initial: T,
  transformer: (contents: T) => undefined | void,
): Promise<T>;

export async function updateFile<T, U extends T = T>(
  file: string,
  initial: T,
  transformer: (contents: T) => U,
): Promise<U>;

export async function updateFile<T>(file: string, initial: T, transformer: (contents: T) => T | void): Promise<T> {
  let release: () => Promise<void>;
  try {
    await mkdir(dirname(file), { recursive: true });
    release = await lockfile.lock(file, { retries: 4, realpath: false });
  } catch (e) {
    console.error('Cannot lock', file, e);
    throw e;
  }
  try {
    let fileContents: T;
    try {
      fileContents = JSON.parse(await readFile(file, 'utf-8'));
    } catch (e) {
      if (initial === undefined) return initial;
      fileContents = initial;
    }
    const newContents = transformer(fileContents) || fileContents;
    await writeFile(file, JSON.stringify(newContents));
    return newContents;
  } finally {
    await release();
  }
}
