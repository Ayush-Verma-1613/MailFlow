import { WORKFLOW_TRIGGER_TYPES, type WorkflowTriggerType } from '@mailflow/shared';
import { Schema, defineModel, type Types } from './_helpers';

export interface IWorkflowTrigger {
  type: WorkflowTriggerType;
  params: Record<string, unknown>;
}

export interface IWorkflowStep {
  type: 'condition' | 'action';
  config: Record<string, unknown>;
}

export interface IWorkflow {
  _id: Types.ObjectId;
  orgId: Types.ObjectId;
  name: string;
  enabled: boolean;
  trigger: IWorkflowTrigger;
  steps: IWorkflowStep[];
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const stepSchema = new Schema<IWorkflowStep>(
  {
    type: { type: String, enum: ['condition', 'action'], required: true },
    config: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false },
);

const workflowSchema = new Schema<IWorkflow>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true },
    name: { type: String, required: true, trim: true },
    enabled: { type: Boolean, default: false },
    trigger: {
      type: { type: String, enum: WORKFLOW_TRIGGER_TYPES, required: true },
      params: { type: Schema.Types.Mixed, default: {} },
    },
    steps: { type: [stepSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

// Engine queries enabled workflows by org + trigger type on each event.
workflowSchema.index({ orgId: 1, enabled: 1, 'trigger.type': 1 });

export const Workflow = defineModel<IWorkflow>('Workflow', workflowSchema);
