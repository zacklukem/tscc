import ts from "typescript";
import { highlight } from "cli-highlight";
import 'colors';

enum ErrorKind {
  Error,
  Warning,
  Note,
}

export class Error {
  readonly kind: ErrorKind;
  readonly node: ts.Node;
  readonly message: string;

  constructor(kind: ErrorKind, node: ts.Node, message: string) {
    this.kind = kind;
    this.node = node;
    this.message = message;
  }

  print(file: ts.SourceFile) {
    const { line, character } = file.getLineAndCharacterOfPosition(
      this.node.getStart()
    );
    let kind_string = "";
    if (this.kind == ErrorKind.Error) kind_string = "Error".red;
    if (this.kind == ErrorKind.Warning) kind_string = "Warning".yellow;
    if (this.kind == ErrorKind.Note) kind_string = "Note".blue;
    let lines = file.getFullText().split("\n");
    console.log(
      `${file.fileName}:${line}:${character}: ${kind_string}: ${this.message}\n`.bold +
        highlight(lines[line], { language: "typescript" }) + "\n" +
				" ".repeat(character) + "^".repeat(this.node.getWidth()).cyan
    );
  }
}

export class ErrorEmitter {
  private errors: Error[] = [];

  hasErrors(): boolean {
    return this.errors.length != 0;
  }

  print(file: ts.SourceFile) {
    this.errors.forEach((e) => e.print(file));
  }

  emit(kind: ErrorKind, node: ts.Node, message: string) {
    this.errors.push(new Error(kind, node, message));
  }

  error(node: ts.Node, message: string) {
    this.emit(ErrorKind.Error, node, message);
  }

  warn(node: ts.Node, message: string) {
    this.emit(ErrorKind.Warning, node, message);
  }

  note(node: ts.Node, message: string) {
    this.emit(ErrorKind.Note, node, message);
  }
}
