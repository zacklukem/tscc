export class Scope<T> {
  private values: Map<string, T>;
  public readonly parent?: Scope<T>;

  constructor(parent?: Scope<T>) {
    this.values = new Map();
    this.parent = parent;
  }

  public add(name: string, value: T) {
    this.values.set(name, value);
  }

  public has(name: string) {
    return this.values.has(name);
  }

  public get(name: string): T | undefined {
    if (this.values.has(name)) return this.values.get(name);
    if (!this.parent) return undefined;
    return this.parent.get(name);
  }
}
