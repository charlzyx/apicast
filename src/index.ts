import type { OpenAPI2 } from "openapi-typescript";

export type SwaggerV2 = OpenAPI2;

export { defineConfig } from "./config";

export { byTags, makeNameByUrl, typingsOf, where } from "./util";
