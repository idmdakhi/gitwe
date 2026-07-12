export interface Message {
  readonly id: string;
  // readonly metadata: MessageMetadata;
  // readonly payload: JsonObject;

  readonly type: string;

  readonly timestamp: Date;
}
