import fs from "fs";
import path from "path";
import { byTags, makeNameByUrl, SwaggerV2, typingsOf, where } from "./util";

const defaultConfig = {
  input: {} as Record<string, string>,
  output: "./apicast/",
  tpl: async (input: SwaggerV2, srouceName: string) => {
    // 根据 tag 分组
    const tags = byTags(input);
    const pickRspType = typingsOf.pickRsp;
    const lines = [
      // 导入类型
      `import { paths } from './${srouceName}DTS';`,
      // 导入辅助函数
      pickRspType,
    ];

    tags.forEach(tag => {
      // 没有方法就不生成
      if (tag.operations.length === 0) return;
      // 描述写入注释
      if (tag.description) {
        lines.push(`\n/** ${tag.description || ""} */`);
      }
      // 导出 tag 对应的模块
      lines.push(`\nexport const ${tag.key} = {`);
      tag.operations.forEach(op => {
        // 拼装单个 请求的代码
        const { method, path } = op;
        const parameterIn = where(op);

        const dataType = [
          parameterIn.query ? `${typingsOf(path, method).query},` : "",
          parameterIn.body ? `${typingsOf(path, method).body},` : "",
          parameterIn.formData ? `${typingsOf(path, method).formData},` : "",
        ].filter(Boolean).join("");

        const fn = [
          "\n",
          op.summary || op.description ? `/** ${op.summary || ""} ${op.description || ""} */` : "",
          "\n",
          `${makeNameByUrl(path, method)}(`,
          dataType ? `data: ${dataType}` : "",
          `): Promise<${typingsOf(path, method).maybeRsp}> {`,
          `return fetch("${path}", {
              method: "${method}",
               ${parameterIn.body || parameterIn.formData ? "body: JSON.stringify(data)" : ""}
            }).then(data => data as any)
          },`,
          "\n",
        ].join("");

        lines.push(fn);
      });
      lines.push(`}\n`);
    });

    return lines.join("\n").replace(/\n\n+/g, "\n");
  },
};

export const defineConfig = (config: Partial<typeof defaultConfig>) => config;

export const loadConf = async (): Promise<typeof defaultConfig> => {
  if (!fs.existsSync("./apicast.config.ts")) {
    fs.writeFileSync("./apicast.config.ts", fs.readFileSync(path.resolve(__dirname, "./tpl")));
  }
  const customeConfigPath = path.resolve(process.cwd(), "./apicast.config.ts");
  const customeConfig = (await import(customeConfigPath)).default;
  console.log("customeConfig", customeConfig);
  return {
    ...defaultConfig,
    ...customeConfig,
  };
};
