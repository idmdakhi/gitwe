import type {
  WorkflowEngine as IWorkflowEngine,
  Workflow,
  WorkflowContext,
  WorkflowStep,
} from "./interfaces/index.js";
import { ConflictError } from "../domain/errors.js";

export class WorkflowEngine<TContext extends WorkflowContext> implements IWorkflowEngine<TContext> {
  async execute(workflow: Workflow<TContext>, context: TContext): Promise<void> {
    // اگر وضعیت قبلی وجود دارد، آن را پاک کن
    await context.clearState();
    context.state.currentStep = "";
    context.state.completedSteps = [];
    await context.saveState();

    for (let i = 0; i < workflow.steps.length; i++) {
      const step = workflow.steps[i];
      const canExecute = await step.canExecute(context);
      if (!canExecute) continue;
      context.state.currentStep = step.id;
      await context.saveState();
      try {
        await step.execute(context);
        context.state.completedSteps.push(step.id);
        await context.saveState();
      } catch (error) {
        if (error instanceof ConflictError) {
          // Conflict را نگه می‌داریم تا resume شود
          throw error;
        }
        // خطای دیگر: پاک کردن وضعیت
        await context.clearState();
        throw error;
      }
    }
    // همهٔ مراحل با موفقیت انجام شد
    await context.clearState();
  }

  async resume(workflow: Workflow<TContext>, context: TContext): Promise<void> {
    const state = context.state;
    if (!state.currentStep) {
      throw new Error("No operation to resume");
    }
    const stepIndex = workflow.steps.findIndex((s) => s.id === state.currentStep);
    if (stepIndex === -1) {
      throw new Error(`Step "${state.currentStep}" not found in workflow`);
    }
    const step = workflow.steps[stepIndex];
    // اگر مرحله قبلاً کامل شده بود، به مرحلهٔ بعد برو
    if (state.completedSteps.includes(step.id)) {
      // ادامه از مرحلهٔ بعد
      const nextIndex = stepIndex + 1;
      const remainingSteps = workflow.steps.slice(nextIndex);
      const subWorkflow: Workflow<TContext> = {
        ...workflow,
        steps: remainingSteps,
      };
      await this.execute(subWorkflow, context);
      return;
    }
    // در غیر این صورت، resume مرحلهٔ فعلی
    try {
      await step.resume(context);
      state.completedSteps.push(step.id);
      await context.saveState();
      // ادامهٔ مراحل بعدی
      const remainingSteps = workflow.steps.slice(stepIndex + 1);
      const subWorkflow: Workflow<TContext> = {
        ...workflow,
        steps: remainingSteps,
      };
      await this.execute(subWorkflow, context);
    } catch (error) {
      if (error instanceof ConflictError) {
        // دوباره Conflict، وضعیت را نگه دار
        throw error;
      }
      await context.clearState();
      throw error;
    }
  }

  async abort(workflow: Workflow<TContext>, context: TContext): Promise<void> {
    const state = context.state;
    if (!state.currentStep) {
      // هیچ عملیاتی در جریان نیست
      return;
    }
    const stepIndex = workflow.steps.findIndex((s) => s.id === state.currentStep);
    if (stepIndex === -1) {
      await context.clearState();
      throw new Error(`Step "${state.currentStep}" not found`);
    }
    // بازگردانی به ترتیب معکوس
    for (let i = stepIndex; i >= 0; i--) {
      const step = workflow.steps[i];
      await step.rollback(context);
    }
    await context.clearState();
  }
}
