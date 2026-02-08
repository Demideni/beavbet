declare module "better-sqlite3" {
  type RunResult = { changes: number; lastInsertRowid: number | bigint };

  interface Statement {
    run(params?: any): RunResult;
    get(params?: any): any;
    all(params?: any): any[];
    pluck(toggleState?: boolean): this;
    raw(toggleState?: boolean): this;
  }

  interface Transaction<T extends (...args: any[]) => any> {
    (...args: Parameters<T>): ReturnType<T>;
    deferred: Transaction<T>;
    immediate: Transaction<T>;
    exclusive: Transaction<T>;
  }

  class Database {
    constructor(filename?: string, options?: any);
    exec(sql: string): this;
    prepare(sql: string): Statement;
    transaction<T extends (...args: any[]) => any>(fn: T): Transaction<T>;
    pragma(source: string, options?: any): any;
    close(): void;
  }

  export default Database;
}
