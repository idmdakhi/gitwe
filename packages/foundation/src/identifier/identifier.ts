import type { Brand } from "../types/brand.js";

export type Identifier<Name extends string> = Brand<string, Name>;
