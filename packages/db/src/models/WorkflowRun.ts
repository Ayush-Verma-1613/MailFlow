import { WORKFLOW_RUN_STATUSES, type WorkflowRunStatus } from '@mailflow/shared';
import { Schema, defineModel, type Types } from './_helpers';

export interface IWorkflowRunLogEntry {
  at: Date;
  level: 'info' | 'warn' | 'error';
  message: string;
  stepIndex?: number;
}

export interface IWorkflowRun {
  _id: Types.ObjectId;
  workflowId: Types.ObjectId;
  orgId: Types.ObjectId;
  /** What this run is about — usually a Message or Thread id. */
  contextRef: { kind: string; id: Types.ObjectId };
  status: WorkflowRunStatus;
  log: IWorkflowRunLogEntry[];
  startedAt: Date;
  finishedAt?: Date;
}

const logSchema = new Schema<IWorkflowRunLogEntry>(
  {
    at: { type: Date, default: Date.now },
    level: { type: String, enum: ['info', 'warn', 'error'], default: 'info' },
    message: { type: String, required: true },
    stepIndex: { type: Number },
  },
  { _id: false },
);

const workflowRunSchema = new Schema<IWorkflowRun>(
  {
    workflowId: { type: Schema.Types.ObjectId, ref: 'Workflow', required: true },
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true },
    contextRef: {
      kind: { type: String, required: true },
      id: { type: Schema.Types.ObjectId, required: true },
    },
    status: { type: String, enum: WORKFLOW_RUN_STATUSES, default: 'pending' },
    log: { type: [logSchema], default: [] },
    startedAt: { type: Date, default: Date.now },
    finishedAt: { type: Date },
  },
  { timestamps: false },
);

workflowRunSchema.index({ workflowId: 1, startedAt: -1 });
workflowRunSchema.index({ orgId: 1, status: 1 });

export const WorkflowRun = defineModel<IWorkflowRun>('WorkflowRun', workflowRunSchema);
