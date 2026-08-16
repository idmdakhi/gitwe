/** pickDefined
 * حذف کلیدهایی که مقدارشان undefined است از یک شیء.
 * برای رعایت exactOptionalPropertyTypes در TypeScript.
 */
export function omitUndefined<T extends Record<string, unknown>>(obj: T): T {
  const result: any = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
      result[key] = val;
    }
  }
  return result as T;
}
