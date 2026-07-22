import { BranchTreeNode } from "../application/dto/StatusReport";

export function renderTree(node: BranchTreeNode, prefix = "", isLast = true): string {
  const marker = prefix === "" ? "" : isLast ? "└── " : "├── ";
  const label = node.isCurrent ? `${node.name} (current)` : node.name;
  const lines = [`${prefix}${marker}${label}`];

  const childPrefix = prefix + (prefix === "" ? "" : isLast ? "    " : "│   ");
  node.children.forEach((child, i) => {
    lines.push(renderTree(child, childPrefix, i === node.children.length - 1));
  });

  return lines.join("\n");
}
