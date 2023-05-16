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

  Object.keys(input).forEach(async (mod) => {
    const source = input[mod];
    try {
      const swagger = await load(source);
      const dts = await openapiTs(source);
      fs.writeFileSync(path.join(outputTo, `/${mod}DTS.ts`), dts);
      const api = await tpl(swagger, mod);
      fs.writeFileSync(path.join(outputTo, `/${mod}.ts`), api);
    } catch (error) {
      console.log("[APICAST ERROR] AT ", mod, "\n", error);
      console.trace(error);
    }
  });

  const indexes = Object.keys(input).map((mod) => `export * as ${mod} from "./${mod}.ts";`);

  fs.writeFileSync(path.join(outputTo, `/index.ts`), indexes.join("\n"));
};
