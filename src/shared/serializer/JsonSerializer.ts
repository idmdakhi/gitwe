export class JsonSerializer {
  static serialize<T>(obj: T): string {
    return JSON.stringify(obj, null, 2);
  }

  static deserialize<T>(json: string): T {
    return JSON.parse(json);
  }

  // برای Domain Objects خاص (مثل Workflow)
  static toJSON(obj: any): any {
    // حذف circular references و متدهای private
    return JSON.parse(JSON.stringify(obj));
  }
}
