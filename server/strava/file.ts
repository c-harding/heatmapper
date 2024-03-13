import { mkdir, readFile, rm, writeFile } from 'fs/promises';
import { dirname } from 'path';
import lockfile from 'proper-lockfile';

/**
 * Lock a file and update its contents.
 *
 * The second overload allows a more specific type to be inferred for the new value of the file.
 */
export async function updateFile<T>(
  file: string,
  initial: T | (() => T),
  transformer: (contents: T) => undefined | void,
): Promise<T>;

export async function updateFile<T>(
  file: string,
  initial: undefined,
  transformer: (contents: T) => T | undefined | null,
): Promise<T | undefined>;

export async function updateFile<T, U extends T = T>(
  file: string,
  initial: T | (() => T),
  transformer: (contents: T) => U | null,
): Promise<U>;

export async function updateFile<T>(
  file: string,
  initial: undefined | T | (() => T),
  transformer: (contents: T) => T | null | undefined,
): Promise<T | undefined> {
  return await withLock(file, async () => {
    let fileContents: T;
    try {
      fileContents = JSON.parse(await readFile(file, 'utf-8'));
    } catch (e) {
      if (initial === undefined) {
        return undefined;
      } else if (initial === null) {
        await rm(file, { force: true });
        return undefined;
      } else if (typeof initial === 'function') {
        fileContents = (initial as () => T)();
      } else {
        fileContents = initial;
      }
    }
    const newContents = transformer(fileContents) || fileContents;
    await writeFile(file, JSON.stringify(newContents));
    return newContents;
  });
}

export async function deleteFile(file: string, read?: false): Promise<undefined>;
export async function deleteFile<T>(file: string, read: true): Promise<T | undefined>;
export async function deleteFile<T>(file: string, read?: boolean): Promise<T | undefined> {
  return await withLock(file, async () => {
    let fileContents: T | undefined;
    if (read) {
      try {
        fileContents = JSON.parse(await readFile(file, 'utf-8'));
      } catch (e) {
        // Ignore failure.
      }
    }
    await rm(file, { force: true });
    return fileContents;
  });
}

async function withLock<T>(file: string, run: () => T): Promise<Awaited<T>> {
  let release: () => Promise<void>;
  try {
    await mkdir(dirname(file), { recursive: true });
    release = await lockfile.lock(file, { retries: 4, realpath: false });
  } catch (e) {
    // TODO: test how this is handled
    console.error('Cannot lock', file, e);
    throw e;
  }
  try {
    return await run();
  } finally {
    await release();
  }
}
