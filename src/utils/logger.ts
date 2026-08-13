type LogFields = Record<string, string | number | boolean | undefined>;

function format(level: string, message: string, fields?: LogFields): string {
  const ts = new Date().toISOString();
  const fieldsStr = fields
    ? " " +
      Object.entries(fields)
        .map(([k, v]) => `${k}=${v}`)
        .join(" ")
    : "";
  return `[${ts}] [${level}] ${message}${fieldsStr}`;
}

export const logger = {
  info(message: string, fields?: LogFields): void {
    console.log(format("INFO", message, fields));
  },
  warn(message: string, fields?: LogFields): void {
    console.warn(format("WARN", message, fields));
  },
  error(message: string, fields?: LogFields): void {
    console.error(format("ERROR", message, fields));
  },
};
