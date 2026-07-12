interface MessageMetadata {
  correlationId: string;

  causationId: string;

  tenantId?: string;

  userId?: string;

  traceId?: string;

  spanId?: string;

  retryCount: number;

  priority: number;
}
