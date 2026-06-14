import { mongoose } from '../connection';
import type { Model, Schema } from 'mongoose';

/**
 * Register a model once. Next.js dev hot-reload re-evaluates modules, which
 * would otherwise throw "OverwriteModelError"; reuse the existing compiled
 * model when present.
 */
export function defineModel<T>(name: string, schema: Schema<T>): Model<T> {
  return (
    (mongoose.models[name] as Model<T> | undefined) ?? mongoose.model<T>(name, schema)
  );
}

export { Schema } from 'mongoose';
export type { Types } from 'mongoose';
