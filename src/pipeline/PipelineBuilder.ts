export class PipelineBuilder {
  private readonly steps: Step[] = [];

  add(step: Step) {
    this.steps.push(step);

    return this;
  }

  build() {
    return new Pipeline(this.steps);
  }
}

