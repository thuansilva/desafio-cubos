import pgp from "pg-promise";

export default interface DatabaseConnection {
  query(statement: string, params: any): Promise<any>;
  close(): Promise<void>;
  oneOrNone(statement: string, params: any): Promise<any>;
  one(statement: string, params: any): Promise<any>;
  manyOrNone(statement: string, params: any): Promise<any>;
}

export class PgPromiseAdapter implements DatabaseConnection {
  connection: any;

  constructor() {
    this.connection = pgp()("postgres://postgres:123456@localhost:5432/app");
  }

  async query(statement: string, params: any): Promise<any> {
    return await this.connection.query(statement, params);
  }

  async one(statement: string, params: any): Promise<any> {
    return await this.connection.one(statement, params);
  }

  async oneOrNone(statement: string, params: any): Promise<any> {
    return await this.connection.oneOrNone(statement, params);
  }

  async manyOrNone(statement: string, params: any): Promise<any> {
    return await this.connection.manyOrNone(statement, params);
  }

  close(): Promise<void> {
    return this.connection.$pool.end();
  }
}
