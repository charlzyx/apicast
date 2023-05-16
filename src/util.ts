import fs from "fs";
import https from "https";
import { OpenAPI2 } from "openapi-typescript";

export type SwaggerV2 = OpenAPI2 & {
  tags: {
    name: string;
    description: string;
  }[];
};

type PickItem<T> = T extends Record<string, infer U> ? U : never;

export const where = (operation: PickItem<SwaggerV2["paths"]>) => {
  const parameters = operation.parameters || [];

  const map = (parameters as any[]).reduce((mapping, param) => {
    mapping[param.in] = true;
    return mapping;
  }, {} as Record<string, boolean>);
  return map as {
    query?: boolean;
    body?: boolean;
    formData?: boolean;
  };
};

export const byTags = (data: SwaggerV2) => {
  const tags = data.tags.reduce((mapping, tag) => {
    const tagKey = tag.description
      .replace("Controller", "")
      .replace(/\s+/g, "")
      .replace(/^\w/, (c) => c.toLowerCase());

    mapping[tag.name] = {
      name: tag.name,
      description: tag.description,
      key: tagKey,
      operations: [],
    };
    return mapping;
  }, {} as Record<string, {
    key: string;
    name: string;
    description: string;
    operations: Array<
      PickItem<SwaggerV2["paths"]> & {
        method: string;
        path: string;
      }
    >;
  }>);

  Object.keys(data.paths!).forEach((path) => {
    const operations = (data.paths as any)[path];
    Object.keys(operations).forEach((method) => {
      const operation = operations[method];
      const tag = operation.tags[0];
      tags[tag].operations.push({
        ...operation,
        method,
        path,
      });
    });
  });

  return Object.values(tags);
};

export const typingsOf = (path: string, operation: string) => {
  return {
    query: `paths["${path}"]["${operation}"]["parameters"]["query"]`,
    body: `paths["${path}"]["${operation}"]["parameters"]["body"]`,
    formData: `paths["${path}"]["${operation}"]["parameters"]["formData"]`,
    response: `paths["${path}"]["${operation}"]["responses"]["200"]["schema"]`,
    maybeRsp: `PickRsp<paths["${path}"]["${operation}"]["responses"]>`,
  };
};

typingsOf.pickRsp = "type PickRsp<T extends any> = T extends { 200: { schema: infer R } } ? R : unknown;";

const toUpperFirstLetter = (text: string) => {
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export const makeNameByUrl = (url: string, requestType: string) => {
  const currUrl = url.slice(0).match(/([^\.]+)/)?.[0] || "";

  return (
    requestType
    + currUrl
      .split("/")
      .map((str) => {
        if (str.includes("-")) {
          str = str.replace(/(\-\w)+/g, (_match, p1) => {
            if (p1) {
              return p1.slice(1).toUpperCase();
            }
          });
        }

        if (str.match(/^{.+}$/gim)) {
          return `By${toUpperFirstLetter(str.slice(1, str.length - 1))}`;
        }
        return toUpperFirstLetter(str);
      })
      .join("")
  );
};

export const load = (url: string): Promise<SwaggerV2> => {
  const isUrl = /http/.test(url);
  if (isUrl) {
    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        res.setEncoding("utf8");
        let rawData = "";
        res.on("data", (chunk) => rawData += chunk);
        res.on("end", () => {
          try {
            resolve(JSON.parse(rawData) as SwaggerV2);
          } catch (err) {
            reject(err);
          }
        });
      }).on("error", (err) => {
        reject(err);
      });
    });
  } else {
    return new Promise((resolve, reject) => {
      fs.readFile(url, "utf8", (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(JSON.parse(data));
        }
      });
    });
  }
};
