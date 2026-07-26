/** Prints `data` as JSON when `json` is true, otherwise runs the human-readable formatter. */
export function printResult<T>(json: boolean, data: T, human: (data: T) => void): void {
  if (json) {
    console.log(JSON.stringify(data));
  } else {
    human(data);
  }
}
