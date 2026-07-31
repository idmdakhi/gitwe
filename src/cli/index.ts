#!/usr/bin/env node
import { run } from "./program.js";

void run().then((code) => {
  process.exitCode = code;
});
