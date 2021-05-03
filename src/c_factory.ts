import { highlight } from "cli-highlight";

export enum NodeKind {
  SourceFile,
  Ident,
  IdentLiteral,
  NumberLiteral,
  BinaryExpr,
  UnaryExpr,
  VarDeclStmt,
  RefType,
  IdentType,
  StructType,
  IfStmt,
  Block,
  Function,
  ExprStmt,
  CallExpr,
  ReturnStmt,
  Struct,
  TypeDef,
  WhileStmt,
  ForStmt,
  StringLiteral,
  CastExpr,
}

export abstract class Node<T> {
  readonly kind: NodeKind;
  constructor(kind: NodeKind) {
    this.kind = kind;
  }

  isSourceFile(): this is SourceFile {
    return this.kind === NodeKind.SourceFile;
  }

  isIdent(): this is Ident {
    return this.kind === NodeKind.Ident;
  }

  isIdentLiteral(): this is IdentLiteral {
    return this.kind === NodeKind.IdentLiteral;
  }

  isNumberLiteral(): this is NumberLiteral {
    return this.kind === NodeKind.NumberLiteral;
  }

  isBinaryExpr(): this is BinaryExpr {
    return this.kind === NodeKind.BinaryExpr;
  }

  isUnaryExpr(): this is UnaryExpr {
    return this.kind === NodeKind.UnaryExpr;
  }

  isVarDeclStmt(): this is VarDeclStmt {
    return this.kind === NodeKind.VarDeclStmt;
  }

  isRefType(): this is RefType {
    return this.kind === NodeKind.RefType;
  }

  isIdentType(): this is IdentType {
    return this.kind === NodeKind.IdentType;
  }

  isStructType(): this is StructType {
    return this.kind === NodeKind.StructType;
  }

  isIfStmt(): this is IfStmt {
    return this.kind === NodeKind.IfStmt;
  }

  isBlock(): this is Block {
    return this.kind === NodeKind.Block;
  }

  isFunction(): this is Function {
    return this.kind === NodeKind.Function;
  }

  isExprStmt(): this is ExprStmt {
    return this.kind === NodeKind.ExprStmt;
  }

  isCallExpr(): this is CallExpr {
    return this.kind === NodeKind.CallExpr;
  }

  isReturnStmt(): this is ReturnStmt {
    return this.kind === NodeKind.ReturnStmt;
  }

  isStruct(): this is Struct {
    return this.kind === NodeKind.Struct;
  }

  isCastExpr(): this is CastExpr {
    return this.kind === NodeKind.CastExpr;
  }

  isTypeDef(): this is TypeDef {
    return this.kind === NodeKind.TypeDef;
  }

  isWhileStmt(): this is WhileStmt {
    return this.kind === NodeKind.WhileStmt;
  }

  isForStmt(): this is ForStmt {
    return this.kind === NodeKind.ForStmt;
  }

  isStringLiteral(): this is StringLiteral {
    return this.kind === NodeKind.StringLiteral;
  }

  isTopLevelStmt(): this is TopLevelStmt {
    return this.isFunction() || this.isStruct() || this.isTypeDef();
  }

  isStmt(): this is Stmt {
    return (
      this.isIfStmt() ||
      this.isVarDeclStmt() ||
      this.isExprStmt() ||
      this.isBlock() ||
      this.isReturnStmt() ||
      this.isForStmt() ||
      this.isWhileStmt()
    );
  }

  isExpr(): this is Expr {
    return (
      this.isBinaryExpr() ||
      this.isUnaryExpr() ||
      this.isCallExpr() ||
      this.isIdentLiteral() ||
      this.isNumberLiteral() ||
      this.isStringLiteral() ||
      this.isCastExpr()
    );
  }
  abstract gen(): T;

  toString() {
    return this.gen();
  }
}

export class SourceFile extends Node<void> {
  private header: string = "#pragma once\n";
  private decl: string = "";
  private body: string = "";
  private tls: TopLevelStmt[] = [];
  public indent_level = 0;

  constructor() {
    super(NodeKind.SourceFile);
  }

  addToHeader(str: string) {
    this.header += str;
  }
  addType(str: string) {
    this.decl = str + this.decl;
  }
  addDeclaration(str: string) {
    this.decl += str;
  }
  addToBody(str: string) {
    this.body += str;
  }
  addTopLevelStmt(stmt: TopLevelStmt) {
    this.tls.push(stmt);
  }
  gen() {
    this.tls.forEach((stmt) => {
      stmt.gen();
    });
  }
  print() {
    console.log("==== START HEADER ====");
    console.log(highlight(this.getHeader(), {language: "c"}));
    console.log("==== START SOURCE ====");
    console.log(highlight(this.getSource(), {language: "c"}));
    // console.log(this.decl + "\n" + this.body);
  }
  getHeader() {
    return this.header;
  }
  getSource() {
    return (
      '#pragma clang diagnostic ignored "-Wparentheses-equality"\n' +
      "#include <stl.h>\n" +
      this.decl +
      "\n//== BODY SECTION ==//\n" +
      this.body +
      "\n#include <end.h>\n"
    );
  }
}
export enum TokenKind {
  Plus = "+",
  Minus = "-",
  Asterisk = "*",
  Slash = "/",
  Percent = "%",
  Carat = "^",
  Tilde = "~",
  Less = "<",
  Greater = ">",
  LessEquals = "<=",
  GreaterEquals = ">=",
  PlusEquals = "+=",
  MinusEquals = "-=",
  AsteriskEquals = "*=",
  SlashEquals = "/=",
  PercentEquals = "%=",
  CaratEquals = "^=",
  Dot = ".",
  MinusGreater = "->",
  Ampersand = "&",
  AmpersandAmpersand = "&&",
  Bar = "|",
  BarBar = "||",
  Equals = "=",
  EqualsEquals = "==",
  Exclamation = "!",
  ExclamationEquals = "!=",
}

export abstract class TopLevelStmt extends Node<void> {
  readonly src: SourceFile;
  constructor(src: SourceFile, kind: NodeKind) {
    super(kind);
    this.src = src;
  }
  abstract gen(): void;
}

export class TypeDef extends TopLevelStmt {
  readonly ret_type: Type;
  readonly name: Ident;
  readonly parameters: [Type, Ident][];

  constructor(
    src: SourceFile,
    ret_type: Type,
    name: Ident,
    parameters: [Type, Ident][]
  ) {
    super(src, NodeKind.TypeDef);
    this.ret_type = ret_type;
    this.name = name;
    this.parameters = parameters;
  }
  gen(): void {
    // TODO: function modifiers
    let parameters = this.parameters
      .map((v) => `${v[0].gen()} ${v[1].gen()}`)
      .join(", ");
    this.src.addType(
      `typedef ${this.ret_type.gen()} (*${this.name.gen()})(${parameters});\n`
    );
  }
}

export class Struct extends TopLevelStmt {
  readonly name: Ident;
  readonly members: [Type, Ident][];
  constructor(src: SourceFile, name: Ident, members: [Type, Ident][]) {
    super(src, NodeKind.Struct);
    this.name = name;
    this.members = members;
  }
  gen(): void {
    let members = this.members
      .map((v) => `  ${v[0].gen()} ${v[1].gen()};\n`)
      .join("");
    this.src.addType(`struct ${this.name.gen()};\n`);
    this.src.addType(
      `typedef struct ${this.name.gen()} ${this.name.gen()}_t;\n`
    );
    this.src.addDeclaration(`struct ${this.name.gen()} {\n${members}};\n`);
  }
}

enum FunctionModifiers {
  Static = 1 << 0,
  Inline = 1 << 1,
}

export class Function extends TopLevelStmt {
  readonly modifiers: FunctionModifiers;
  readonly in_header: boolean;
  readonly ret_type: Type;
  readonly name: Ident;
  readonly parameters: [Type, Ident][];
  readonly body: Block;

  constructor(
    src: SourceFile,
    modifiers: FunctionModifiers,
    in_header: boolean,
    ret_type: Type,
    name: Ident,
    parameters: [Type, Ident][],
    body: Block
  ) {
    super(src, NodeKind.Function);
    this.modifiers = modifiers;
    this.in_header = in_header;
    this.ret_type = ret_type;
    this.name = name;
    this.parameters = parameters;
    this.body = body;
  }
  gen(): void {
    // TODO: function modifiers
    let parameters = this.parameters
      .map((v) => `${v[0].gen()} ${v[1].gen()}`)
      .join(", ");
    let signature = `${this.ret_type.gen()} ${this.name.gen()}(${parameters})`;
    let body = this.body.gen();
    if (this.in_header) this.src.addToHeader(signature + ";\n");
    else this.src.addDeclaration(signature + ";\n");
    this.src.addToBody(`${signature} ${body}\n\n`);
  }
}

export class Ident extends Node<string> {
  readonly src: SourceFile;
  readonly value: string;
  constructor(src: SourceFile, value: string) {
    super(NodeKind.Ident);
    this.src = src;
    this.value = value;
  }
  gen(): string {
    return this.value;
  }
}

export abstract class Type extends Node<string> {
  readonly src: SourceFile;
  constructor(src: SourceFile, kind: NodeKind) {
    super(kind);
    this.src = src;
  }
  abstract gen(): string;
}

export class IdentType extends Type {
  readonly ident: Ident;
  constructor(src: SourceFile, ident: Ident) {
    super(src, NodeKind.IdentType);
    this.ident = ident;
  }
  gen(): string {
    return this.ident.gen();
  }
}

export class StructType extends Type {
  readonly ident: Ident;
  constructor(src: SourceFile, ident: Ident) {
    super(src, NodeKind.StructType);
    this.ident = ident;
  }
  gen(): string {
    return `${this.ident.gen()}_t`;
  }
}

export class RefType extends Type {
  readonly element_type: Type;
  constructor(src: SourceFile, element_type: Type) {
    super(src, NodeKind.RefType);
    this.element_type = element_type;
  }
  gen(): string {
    return `${this.element_type.gen()}*`;
  }
}

export abstract class Expr extends Node<string> {
  readonly src: SourceFile;
  constructor(src: SourceFile, kind: NodeKind) {
    super(kind);
    this.src = src;
  }
  abstract gen(): string;
}

type BinaryOperator =
  | TokenKind.Plus
  | TokenKind.Minus
  | TokenKind.Asterisk
  | TokenKind.Slash
  | TokenKind.Percent
  | TokenKind.Carat
  | TokenKind.Less
  | TokenKind.Greater
  | TokenKind.LessEquals
  | TokenKind.GreaterEquals
  | TokenKind.PlusEquals
  | TokenKind.MinusEquals
  | TokenKind.AsteriskEquals
  | TokenKind.SlashEquals
  | TokenKind.PercentEquals
  | TokenKind.CaratEquals
  | TokenKind.Ampersand
  | TokenKind.AmpersandAmpersand
  | TokenKind.Dot
  | TokenKind.MinusGreater
  | TokenKind.Bar
  | TokenKind.BarBar
  | TokenKind.Equals
  | TokenKind.EqualsEquals
  | TokenKind.ExclamationEquals;

export function isBinaryOperator(kind: TokenKind): kind is BinaryOperator {
  return (
    kind === TokenKind.Plus ||
    kind === TokenKind.Minus ||
    kind === TokenKind.Asterisk ||
    kind === TokenKind.Slash ||
    kind === TokenKind.Percent ||
    kind === TokenKind.Carat ||
    kind === TokenKind.Less ||
    kind === TokenKind.Greater ||
    kind === TokenKind.LessEquals ||
    kind === TokenKind.GreaterEquals ||
    kind === TokenKind.PlusEquals ||
    kind === TokenKind.MinusEquals ||
    kind === TokenKind.AsteriskEquals ||
    kind === TokenKind.SlashEquals ||
    kind === TokenKind.PercentEquals ||
    kind === TokenKind.CaratEquals ||
    kind === TokenKind.Ampersand ||
    kind === TokenKind.AmpersandAmpersand ||
    kind === TokenKind.Dot ||
    kind === TokenKind.MinusGreater ||
    kind === TokenKind.Bar ||
    kind === TokenKind.BarBar ||
    kind === TokenKind.Equals ||
    kind === TokenKind.EqualsEquals ||
    kind === TokenKind.ExclamationEquals
  );
}

export class BinaryExpr extends Expr {
  readonly lhs: Expr;
  readonly operator: BinaryOperator;
  readonly rhs: Expr;
  constructor(src: SourceFile, lhs: Expr, operator: BinaryOperator, rhs: Expr) {
    super(src, NodeKind.BinaryExpr);
    this.lhs = lhs;
    this.operator = operator;
    this.rhs = rhs;
  }
  gen(): string {
    return `(${this.lhs.gen()} ${this.operator} ${this.rhs.gen()})`;
  }
}

type UnaryOperator =
  | TokenKind.Minus
  | TokenKind.Asterisk
  | TokenKind.Exclamation
  | TokenKind.Ampersand
  | TokenKind.Tilde;

export function isUnaryOperator(kind: TokenKind): kind is BinaryOperator {
  return (
    kind === TokenKind.Minus ||
    kind === TokenKind.Asterisk ||
    kind === TokenKind.Exclamation ||
    kind === TokenKind.Tilde
  );
}

export class UnaryExpr extends Expr {
  readonly operator: UnaryOperator;
  readonly operand: Expr;
  constructor(src: SourceFile, operator: UnaryOperator, operand: Expr) {
    super(src, NodeKind.UnaryExpr);
    this.operator = operator;
    this.operand = operand;
  }
  gen(): string {
    return `(${this.operator}${this.operand})`;
  }
}

export class CastExpr extends Expr {
  readonly type: Type;
  readonly expression: Expr;
  constructor(src: SourceFile, type: Type, expression: Expr) {
    super(src, NodeKind.CastExpr);
    this.type = type;
    this.expression = expression;
  }
  gen(): string {
    return `(${this.type.gen()})(${this.expression.gen()})`;
  }
}

export class CallExpr extends Expr {
  readonly expression: Expr;
  readonly parameters: Expr[];
  constructor(src: SourceFile, expression: Expr, parameters: Expr[]) {
    super(src, NodeKind.CallExpr);
    this.expression = expression;
    this.parameters = parameters;
  }
  gen(): string {
    return `${this.expression.gen()}(${this.parameters
      .map((v) => v.gen())
      .join(", ")})`;
  }
}

export class IdentLiteral extends Expr {
  readonly ident: Ident;
  constructor(src: SourceFile, ident: Ident) {
    super(src, NodeKind.IdentLiteral);
    this.ident = ident;
  }
  gen(): string {
    return this.ident.gen();
  }
}

export class NumberLiteral extends Expr {
  readonly value: string;
  constructor(src: SourceFile, value: string) {
    super(src, NodeKind.NumberLiteral);
    this.value = value;
  }
  gen(): string {
    return this.value;
  }
}

export class StringLiteral extends Expr {
  readonly value: string;
  constructor(src: SourceFile, value: string) {
    super(src, NodeKind.StringLiteral);
    this.value = value;
  }
  gen(): string {
    return this.value;
  }
}

export abstract class Stmt extends Node<string> {
  readonly src: SourceFile;
  constructor(src: SourceFile, kind: NodeKind) {
    super(kind);
    this.src = src;
  }
  abstract gen(): string;
}

export class Block extends Stmt {
  readonly statements: Stmt[];
  constructor(src: SourceFile, statements: Stmt[]) {
    super(src, NodeKind.Block);
    this.statements = statements;
  }
  gen(): string {
    this.src.indent_level++;
    return `{\n${this.statements
      .map((stmt) => "  ".repeat(this.src.indent_level) + stmt.gen())
      .join("\n")}\n${"  ".repeat(--this.src.indent_level)}}`;
  }
}

export class ReturnStmt extends Stmt {
  readonly expression?: Expr;
  constructor(src: SourceFile, expression?: Expr) {
    super(src, NodeKind.ReturnStmt);
    this.expression = expression;
  }
  gen(): string {
    if (this.expression) return `return ${this.expression.gen()};`;
    return "return;";
  }
}

export class VarDeclStmt extends Stmt {
  readonly type: Type;
  readonly name: Ident;
  readonly initializer?: Expr;
  constructor(src: SourceFile, type: Type, name: Ident, initializer?: Expr) {
    super(src, NodeKind.VarDeclStmt);
    this.type = type;
    this.name = name;
    this.initializer = initializer;
  }
  gen(): string {
    return (
      `${this.type.gen()} ${this.name.gen()}` +
      (this.initializer ? ` = ${this.initializer.gen()};\n` : ";")
    );
  }
}

export class IfStmt extends Stmt {
  readonly condition: Expr;
  readonly body: Stmt;
  readonly then?: IfStmt | Block;
  constructor(
    src: SourceFile,
    condition: Expr,
    body: Stmt,
    then?: IfStmt | Block
  ) {
    super(src, NodeKind.IfStmt);
    this.condition = condition;
    this.body = body;
    this.then = then;
  }
  gen(): string {
    return `if (${this.condition.gen()}) ${this.body.gen()}${
      this.then ? " else " : ""
    }${this.then?.gen() || ""}`;
  }
}

export class WhileStmt extends Stmt {
  readonly condition: Expr;
  readonly body: Stmt;
  constructor(src: SourceFile, condition: Expr, body: Stmt) {
    super(src, NodeKind.WhileStmt);
    this.condition = condition;
    this.body = body;
  }
  gen(): string {
    return `while (${this.condition.gen()}) ${this.body.gen()}`;
  }
}

export class ForStmt extends Stmt {
  readonly initializer?: Stmt;
  readonly condition: Expr;
  readonly incrementor?: Expr;
  readonly body: Stmt;
  constructor(
    src: SourceFile,
    condition: Expr,
    body: Stmt,
    initializer?: Stmt,
    incrementor?: Expr
  ) {
    super(src, NodeKind.WhileStmt);
    this.initializer = initializer;
    this.condition = condition;
    this.incrementor = incrementor;
    this.body = body;
  }
  gen(): string {
    return `for (${
      this.initializer ? this.initializer.gen() : "/*none*/;"
    }${this.condition.gen()};${
      this.incrementor ? this.incrementor.gen() : "/*none*/"
    }) ${this.body.gen()}`;
  }
}

export class ExprStmt extends Stmt {
  readonly expression: Expr;
  constructor(src: SourceFile, expression: Expr) {
    super(src, NodeKind.ExprStmt);
    this.expression = expression;
  }
  gen(): string {
    return `${this.expression.gen()};`;
  }
}

export class Factory {
  readonly src: SourceFile;
  constructor(src: SourceFile) {
    this.src = src;
  }

  createFunction(
    modifiers: FunctionModifiers,
    in_header: boolean,
    ret_type: Type,
    name: Ident,
    parameters: [Type, Ident][],
    body: Block
  ): Function {
    return new Function(
      this.src,
      modifiers,
      in_header,
      ret_type,
      name,
      parameters,
      body
    );
  }

  createIdent(value: string) {
    return new Ident(this.src, value);
  }

  createIdentType(value: Ident | string) {
    let v_id = typeof value === "string" ? new Ident(this.src, value) : value;
    return new IdentType(this.src, v_id);
  }

  createStructType(value: Ident | string) {
    let v_id = typeof value === "string" ? new Ident(this.src, value) : value;
    return new StructType(this.src, v_id);
  }

  createRefType(type: Type) {
    return new RefType(this.src, type);
  }

  createBinaryExpr(lhs: Expr, operator: BinaryOperator, rhs: Expr) {
    return new BinaryExpr(this.src, lhs, operator, rhs);
  }

  createUnaryExpr(operator: UnaryOperator, operand: Expr) {
    return new UnaryExpr(this.src, operator, operand);
  }

  createCallExpr(expression: Expr, parameters: Expr[]) {
    return new CallExpr(this.src, expression, parameters);
  }

  createIdentLiteral(value: Ident | string) {
    let v_id = typeof value === "string" ? new Ident(this.src, value) : value;
    return new IdentLiteral(this.src, v_id);
  }

  createNumberLiteral(value: string) {
    return new NumberLiteral(this.src, value);
  }

  createBlock(statements: Stmt[]) {
    return new Block(this.src, statements);
  }

  createVarDeclStmt(type: Type, name: Ident, initializer?: Expr) {
    return new VarDeclStmt(this.src, type, name, initializer);
  }

  createIfStmt(condition: Expr, body: Stmt, then?: Block | IfStmt) {
    return new IfStmt(this.src, condition, body, then);
  }

  createExprStmt(expression: Expr) {
    return new ExprStmt(this.src, expression);
  }

  createReturnStmt(expression?: Expr) {
    return new ReturnStmt(this.src, expression);
  }

  createStruct(name: Ident, members: [Type, Ident][]) {
    return new Struct(this.src, name, members);
  }

  createTypeDef(ret_type: Type, name: Ident, parameters: [Type, Ident][]) {
    return new TypeDef(this.src, ret_type, name, parameters);
  }

  createWhileStmt(condition: Expr, body: Stmt) {
    return new WhileStmt(this.src, condition, body);
  }

  createStringLiteral(value: string) {
    return new StringLiteral(this.src, value);
  }

  createCastExpr(type: Type, expression: Expr) {
    return new CastExpr(this.src, type, expression);
  }

  createForStmt(
    condition: Expr,
    body: Stmt,
    initializer?: Stmt,
    incrementor?: Expr
  ) {
    return new ForStmt(this.src, condition, body, initializer, incrementor);
  }
}
