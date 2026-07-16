export class TvTimeImportError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "TvTimeImportError";
  }
}

export class TvTimeImportDatabaseError extends Error {
  readonly code: string;

  constructor(databaseCode: string | undefined) {
    super("TV Time import initialization failed in the database.");
    this.name = "TvTimeImportDatabaseError";
    this.code = databaseCode && /^[A-Z0-9_]{2,20}$/i.test(databaseCode)
      ? `database_${databaseCode.toLocaleLowerCase("en-US")}`
      : "database_error";
  }
}
