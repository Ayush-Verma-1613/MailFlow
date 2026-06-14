/**
 * @mailflow/workflows — pure trigger→condition→action engine. Side effects are
 * delegated to an injected ActionExecutor, keeping this package free of
 * database/email dependencies.
 */
export * from './dsl';
export {
  evaluateCondition,
  runWorkflowSteps,
  triggerMatches,
  type WorkflowStepInput,
  type RunOutcome,
} from './engine';
