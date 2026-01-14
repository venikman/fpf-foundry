import { runCliAsync } from "./cli.ts";

const exitCode = await runCliAsync(process.argv.slice(2));
process.exit(exitCode);
