import { writeFileSync, readFileSync } from "fs";
import ts from "typescript";
import { CGenPass } from "./cpp_gen_pass";
// import { GenVisitor } from "./gen";
import { InferPass } from "./cpp_infer_pass";
import { InternalError } from "./err";
import * as cc from "./cpp_factory";

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
  if (infer_pass.e.hasErrors()) {
    infer_pass.e.print(sourceFile);
    return;
  }
  const gen_pass = new CGenPass();
  const node = gen_pass.visit(sourceFile);
  if (!node) throw new InternalError("wtf");
  node.gen();
  let s = node as cc.SourceFile;
  s.print();

  writeFileSync("example.h", s.getHeader());
  writeFileSync("example.cc", s.getSource());

  // const gen_pass = new GenVisitor();
  // gen_pass.visit(sourceFile);
  // gen_pass.print();
});
