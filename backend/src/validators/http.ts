import type { Request } from "express";
import type { z, ZodTypeAny } from "zod";

export function parseBody<TSchema extends ZodTypeAny>(schema: TSchema, req: Request): z.infer<TSchema> {
  return schema.parse(req.body ?? {});
}

export function parseQuery<TSchema extends ZodTypeAny>(schema: TSchema, req: Request): z.infer<TSchema> {
  return schema.parse(req.query ?? {});
}

export function parseParams<TSchema extends ZodTypeAny>(schema: TSchema, req: Request): z.infer<TSchema> {
  return schema.parse(req.params ?? {});
}
