import { readFileSync } from "fs";
import ts from "typescript";
import { GenVisitor } from "./gen";



const fileNames = process.argv.slice(2);
fileNames.forEach((fileName) => {
  // Parse a file
  const sourceFile = ts.createSourceFile(
    fileName,
    readFileSync(fileName).toString(),
    ts.ScriptTarget.ES2015,
    /*setParentNodes */ true
  );

	const gv = new GenVisitor();
  gv.visit(sourceFile);
	gv.print();
});
