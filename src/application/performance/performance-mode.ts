export function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development" || process.env.NODE_ENV === undefined;
}

export function isPerformanceEnabled(explicit?: boolean): boolean {
  if (explicit === true) {
    return true;
  }

  if (process.env.GITWE_PERFORMANCE === "1") {
    return true;
  }

  if (process.env.GITWE_PERFORMANCE === "0") {
    return false;
  }

  return process.env.NODE_ENV === "development";
}
