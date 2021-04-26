import { readFileSync } from "fs";
import ts from "typescript";
import { GenVisitor } from "./gen";
import { InferPass } from "./infer_pass";

const fileNames = process.argv.slice(2);
fileNames.forEach((fileName) => {
  // Parse a file
  const sourceFile = ts.createSourceFile(
    fileName,
    readFileSync(fileName).toString(),
    ts.ScriptTarget.ES2015,
    /*setParentNodes */ true
  );

  const infer_pass = new InferPass();
  infer_pass.visit(sourceFile);
  const gen_pass = new GenVisitor();
  gen_pass.visit(sourceFile);
  gen_pass.print();
});
