import chalk from "chalk";
import fs from "fs";
import openapiTs from "openapi-typescript";
import path from "path";
import { loadConf } from "./config";
import { load } from "./util";

export const exec = async () => {
  const conf = await loadConf();
  const { input, output, tpl } = conf;

  const outputTo = path.isAbsolute(output) ? output : path.resolve(process.cwd(), output);
  if (!fs.existsSync(outputTo)) {
    fs.mkdirSync(outputTo, { recursive: true });
  }

  const indexes = [""];
  Object.keys(input).forEach(async (mod) => {
    const source = input[mod];

    try {
      const swagger = await load(source);
      const dts = await openapiTs(source);
      fs.writeFileSync(outputTo + `/${mod}DTS.ts`, dts);
      const api = await tpl(swagger, mod);
      fs.writeFileSync(outputTo + `/${mod}.ts`, api);
      indexes.push(`export * as ${mod} from "./${mod}.ts";`);
    } catch (error) {
      chalk.red("APICAST ERROR AT ", mod, "\n", error);
      console.trace(error);
    }
  });
  fs.writeFileSync(outputTo + `/index.ts`, indexes.join("\n"));
};
