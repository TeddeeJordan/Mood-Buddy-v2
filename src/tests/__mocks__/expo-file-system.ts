// In-memory expo-file-system (File / Directory / Paths subset) for Jest.
// Files and directories are URIs in two sets; nothing touches the real disk.
const files = new Set<string>();
const directories = new Set<string>();

type Segment = string | File | Directory;

function join(segments: Segment[]): string {
  const parts = segments.map((s) => (typeof s === 'string' ? s : s.uri));
  const joined = parts.map((p, i) => (i === 0 ? p.replace(/\/+$/, '') : p.replace(/^\/+|\/+$/g, ''))).join('/');
  return joined;
}

function nameOf(uri: string): string {
  return uri.replace(/\/+$/, '').split('/').pop() ?? '';
}

function parentOf(uri: string): string {
  return uri.replace(/\/+$/, '').split('/').slice(0, -1).join('/');
}

export class File {
  readonly uri: string;
  constructor(...uris: Segment[]) {
    this.uri = join(uris);
  }
  get name(): string {
    return nameOf(this.uri);
  }
  get exists(): boolean {
    return files.has(this.uri);
  }
  async copy(destination: File | Directory): Promise<void> {
    if (!files.has(this.uri)) throw new Error('Source file does not exist');
    const target = destination instanceof Directory ? join([destination, this.name]) : destination.uri;
    if (!directories.has(parentOf(target))) throw new Error('Destination directory does not exist');
    if (files.has(target)) throw new Error('Destination already exists');
    files.add(target);
  }
  delete(): void {
    if (!files.has(this.uri)) throw new Error('File does not exist');
    files.delete(this.uri);
  }
}

export class Directory {
  readonly uri: string;
  constructor(...uris: Segment[]) {
    this.uri = join(uris);
  }
  get name(): string {
    return nameOf(this.uri);
  }
  get exists(): boolean {
    return directories.has(this.uri);
  }
  create(options?: { intermediates?: boolean; idempotent?: boolean }): void {
    if (directories.has(this.uri)) {
      if (options?.idempotent) return;
      throw new Error('Directory already exists');
    }
    if (!options?.intermediates && !directories.has(parentOf(this.uri))) {
      throw new Error('Parent directory does not exist');
    }
    let uri = this.uri;
    while (uri !== '' && !directories.has(uri)) {
      directories.add(uri);
      uri = parentOf(uri);
    }
  }
  list(): (File | Directory)[] {
    if (!directories.has(this.uri)) throw new Error('Directory does not exist');
    const children = (set: Set<string>) => [...set].filter((uri) => parentOf(uri) === this.uri);
    return [...children(directories).map((u) => new Directory(u)), ...children(files).map((u) => new File(u))];
  }
  delete(): void {
    const prefix = `${this.uri}/`;
    for (const uri of [...files]) if (uri.startsWith(prefix)) files.delete(uri);
    for (const uri of [...directories]) if (uri === this.uri || uri.startsWith(prefix)) directories.delete(uri);
  }
}

const DOCUMENT_URI = 'file:///data/document';
const CACHE_URI = 'file:///data/cache';

export class Paths {
  static get document(): Directory {
    return new Directory(DOCUMENT_URI);
  }
  static get cache(): Directory {
    return new Directory(CACHE_URI);
  }
}

/** Test helper: empty the fake file system (the document and cache directories exist). */
export function __resetFileSystem(): void {
  files.clear();
  directories.clear();
  directories.add(DOCUMENT_URI);
  directories.add(CACHE_URI);
}

/** Test helper: create a file (e.g. a picker result in the cache directory). */
export function __addFile(uri: string): void {
  files.add(uri);
}

/** Test helper: every file URI currently stored. */
export function __listFiles(): string[] {
  return [...files].sort();
}

__resetFileSystem();
