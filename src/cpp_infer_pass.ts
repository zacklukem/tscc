import { NodeVisitor } from "./visitor";
import ts from "typescript";
import { Scope } from "./scope";
import * as ty from "./types";
import { TypeVisitor } from "./type_visitor";
import { InternalError } from "./err";
import { ErrorEmitter } from "./error_emitter";
import sha1 from "js-sha1";

export class InferTypePass extends TypeVisitor<ty.Type> {
  current_scope: Scope<ty.Type>;
  constructor(current_scope: Scope<ty.Type>) {
    super();
    this.current_scope = current_scope;
  }
  protected visitNumberKeyword(
    _node: ts.KeywordToken<ts.SyntaxKind.NumberKeyword>
  ): ty.Type {
    return new ty.NumberType();
  }

  protected visitFunctionTypeNode(node: ts.FunctionTypeNode): ty.Type {
    let ret_type = this.visit(node.type);
    let params = node.parameters.map((param) => {
      if (!param.type) throw new InternalError("Missing type"); // TODO: add error message:
      return this.visit(param.type);
    });
    return new ty.FunctionType(
      node.name?.getText(),
      ret_type,
      params,
      sha1(node.getText())
    );
  }

  protected visitVoidKeyword(
    _node: ts.KeywordToken<ts.SyntaxKind.VoidKeyword>
  ): ty.Type {
    return new ty.VoidType();
  }

  protected visitTypeLiteralNode(_node: ts.TypeLiteralNode): ty.Type {
    throw new Error("Method not implemented.");
  }

  protected visitTypeReferenceNode(node: ts.TypeReferenceNode): ty.Type {
    let ty = this.current_scope.get(node.typeName.getText());
    if (!ty) throw new InternalError("Type is not found valid identifier"); // TODO: real message
    return ty;
  }

  protected visitArrayTypeNode(node: ts.ArrayTypeNode): ty.Type {
    return new ty.ArrayType(this.visit(node.elementType));
  }

  protected visitStringKeyword(
    _node: ts.KeywordToken<ts.SyntaxKind.StringKeyword>
  ): ty.Type {
    return new ty.StringType();
  }
}

export class InferPass extends NodeVisitor<void> {
  private current_scope: Scope<ty.Type>;
  private tv: InferTypePass;
  readonly e: ErrorEmitter = new ErrorEmitter();

  constructor() {
    super();
    this.current_scope = new Scope();

    let console_m = new Map();
    console_m.set("log", {
      index: 0,
      type: new ty.FunctionType("log", new ty.VoidType(), [new ty.AnyType()]),
    });

    this.current_scope.add("console", new ty.ClassType("Console", console_m));

    this.tv = new InferTypePass(this.current_scope);
  }

  private enterScope() {
    this.current_scope = new Scope(this.current_scope);
    this.tv.current_scope = this.current_scope;
  }

  private exitScope() {
    this.current_scope = this.current_scope.parent || new Scope();
    this.tv.current_scope = this.current_scope;
  }

  protected visitSourceFile(node: ts.SourceFile): void {
    if (!node.metadata) node.metadata = {};
    this.enterScope();
    node.forEachChild(this.visit);
    this.exitScope();
  }

  protected visitFunctionDeclaration(node: ts.FunctionDeclaration): void {
    if (!node.metadata) node.metadata = {};
    if (!node.type)
      return this.e.error(node, "Function declaration is missing return type");
    if (!node.name) return this.e.error(node, "Function must have name");

    try {
      node.metadata.infer_type = new ty.FunctionType(
        node.name?.getText(),
        this.tv.visit(node.type),
        node.parameters.map((param) => {
          if (!param.type) {
            this.e.error(
              param,
              "Parameter is missing explicit type declaration"
            );
            throw 1;
          }
          let ty = this.tv.visit(param.type);
          this.current_scope.add(param.name.getText(), ty);
          return ty;
        })
      );
    } catch (e) {
      if (typeof e === "number") return; // Break out of outer function with inner throw
      throw e;
    }
    this.current_scope.add(node.name.getText(), node.metadata.infer_type);
    this.enterScope();
    if (node.body) this.visit(node.body);
    this.exitScope();
    // node.forEachChild(this.visit);
  }

  protected visitBlock(node: ts.Block): void {
    this.enterScope();
    node.forEachChild(this.visit);
    this.exitScope();
  }

  protected visitReturnStatement(node: ts.ReturnStatement): void {
    node.forEachChild(this.visit);
  }

  protected visitNumericLiteral(node: ts.NumericLiteral): void {
    if (!node.metadata) node.metadata = {};
    node.metadata.infer_type = new ty.NumberType();
  }

  protected visitIdentifier(node: ts.Identifier): void {
    if (!node.metadata) node.metadata = {};
    let ty = this.current_scope.get(node.getText());
    if (!ty)
      return this.e.error(node, "Name is not found in the current scope");
    node.metadata.infer_type = ty;
  }

  protected visitVariableStatement(node: ts.VariableStatement): void {
    this.visit(node.declarationList);
  }

  protected visitVariableDeclarationList(
    node: ts.VariableDeclarationList
  ): void {
    node.forEachChild(this.visit);
  }

  protected visitVariableDeclaration(node: ts.VariableDeclaration): void {
    if (!node.metadata) node.metadata = {};
    if (node.initializer) this.visit(node.initializer);
    if (node.initializer && !node.type) {
      node.metadata.infer_type = node.initializer.metadata?.infer_type;
    } else if (node.type) {
      node.metadata.infer_type = this.tv.visit(node.type);
    } else {
      this.e.error(node, "Unable to infer type");
      this.e.note(node.name, "Add explicit type here");
      return;
    }
    // This is probably an internal error due to the rhs of the let statement
    // not being inferred correctly
    if (!node.metadata.infer_type) {
      this.e.error(node, "Unable to infer type");
      this.e.note(node.name, "Add explicit type here");
      return;
    }

    if (node.initializer?.metadata?.infer_type)
      node.initializer.metadata.infer_type.resolveGenerics(
        node.metadata.infer_type
      );

    if (
      node.initializer?.metadata?.infer_type &&
      !node.metadata.infer_type.isCompatibleWith(
        node.initializer.metadata.infer_type
      )
    ) {
      this.e.error(node, "Types are not compatible");
      this.e.note(
        node.initializer,
        node.initializer.metadata.infer_type.toString()
      );
      this.e.note(node.name, node.metadata.infer_type.toString());
    }
    this.current_scope.add(node.name.getText(), node.metadata.infer_type);
  }

  protected visitIfStatement(node: ts.IfStatement): void {
    node.forEachChild(this.visit);
  }

  protected visitWhileStatement(node: ts.WhileStatement): void {
    node.forEachChild(this.visit);
  }

  protected visitForStatement(node: ts.ForStatement): void {
    node.forEachChild(this.visit);
  }

  protected visitExpressionStatement(node: ts.ExpressionStatement): void {
    this.visit(node.expression);
  }

  protected visitBinaryExpression(node: ts.BinaryExpression): void {
    if (!node.metadata) node.metadata = {};
    this.visit(node.left);
    this.visit(node.right);
    if (!node.left.metadata?.infer_type)
      throw new InternalError("Failed to infer");
    if (!node.right.metadata?.infer_type)
      throw new InternalError("Failed to infer");

    if (
      !node.left.metadata?.infer_type.isCompatibleWith(
        node.right.metadata?.infer_type
      )
    ) {
      this.e.error(
        node.operatorToken,
        "Types of left and right expressions are not equal"
      );
      this.e.note(node.left, node.left.metadata?.infer_type.toString());
      this.e.note(node.right, node.right.metadata?.infer_type.toString());
      return;
    }
    node.metadata.infer_type = node.left.metadata?.infer_type;
  }

  protected visitPostfixUnaryExpression(node: ts.PostfixUnaryExpression): void {
    if (!node.metadata) node.metadata = {};
    this.visit(node.operand);
    node.metadata.infer_type = node.operand.metadata?.infer_type;
  }

  protected visitCallExpression(node: ts.CallExpression): void {
    if (!node.metadata) node.metadata = {};
    this.visit(node.expression);
    let ty = node.expression.metadata?.infer_type;
    if (!ty) {
      if (!this.e.hasErrors())
        this.e.error(node.expression, "Cannot find function name in scope");
      return; // TODO: should it emit error here?
    }

    if (!ty.isFunction()) {
      return this.e.error(node, "Cannot call a non-function value");
    }

    if (node.arguments.length != ty.parameters.length) {
      return this.e.error(node, `expected ${ty.parameters.length} arguments`);
    }
    node.arguments.forEach((arg, i) => {
      this.visit(arg);
      if (!arg.metadata?.infer_type) return this.e.error(arg, "Unknown type");
      if (!ty)
        return this.e.error(
          node.expression,
          "Cannot find function name in scope"
        );
      if (!ty.isFunction())
        return this.e.error(node, "Cannot call a non-function value");

      if (
        !ty.parameters[i].isVoid() &&
        !ty.parameters[i].isCompatibleWith(arg.metadata.infer_type)
      ) {
        return this.e.error(
          arg,
          `Cannot implicitly cast ${arg.metadata.infer_type} to ${ty.parameters[i]}`
        );
      }
    });
    node.metadata.func_type = ty;
    node.metadata.infer_type = ty.return_type;
  }

  protected visitArrowFunction(node: ts.ArrowFunction): void {
    if (!node.metadata) node.metadata = {};
    this.enterScope();
    let params = node.parameters.map((param) => {
      if (!param.type) {
        this.e.error(param, "Parameter is missing explicit type declaration");
        throw 1;
      }
      let ty = this.tv.visit(param.type);
      this.current_scope.add(param.name.getText(), ty);
      return ty;
    });
    if (!node.type) return this.e.error(node, "expected return type");
    node.metadata.infer_type = new ty.FunctionType(
      undefined,
      this.tv.visit(node.type),
      params
    );
    if (node.body) this.visit(node.body);
    this.exitScope();
  }

  protected visitClassDeclaration(node: ts.ClassDeclaration): void {
    if (!node.name)
      return this.e.error(node, "Class declaration is missing class name");

    let data: Map<string, ty.ClassMember> = new Map();
    node.members.forEach((member, i) => {
      if (member.kind === ts.SyntaxKind.PropertyDeclaration) {
        let m = member as ts.PropertyDeclaration;
        if (!m.type) {
          return this.e.error(
            m.name,
            "Class property must explicitly declare type"
          );
        }
        data.set(m.name.getText(), {
          index: i,
          type: this.tv.visit(m.type),
        });
      } else if (member.kind === ts.SyntaxKind.MethodDeclaration) {
        let m = member as ts.MethodDeclaration;
        if (!m.type) {
          return this.e.error(
            m.name,
            "Class property must explicitly declare type"
          );
        }
        let f_type = new ty.FunctionType(
          m.name?.getText(),
          this.tv.visit(m.type),
          m.parameters.map((param) => {
            if (!param.type) {
              this.e.error(
                param,
                "Parameter is missing explicit type declaration"
              );
              throw 1;
            }
            let ty = this.tv.visit(param.type);
            this.current_scope.add(param.name.getText(), ty);
            return ty;
          })
        );
        data.set(m.name.getText(), {
          index: i,
          type: f_type,
        });
      }
    });
    this.current_scope.add(
      node.name.getText(),
      new ty.ClassType(node.name.getText(), data)
    );
  }

  protected visitNewExpression(node: ts.NewExpression): void {
    if (!node.metadata) node.metadata = {};
    // TODO: fix node.expression to use namespaces etc.
    this.visit(node.expression);
    let ty = node.expression.metadata?.infer_type;
    if (!ty)
      return this.e.error(
        node.expression,
        "Class name is not found in the current scope"
      );
    node.metadata.infer_type = this.current_scope.get(
      node.expression.getText()
    );
  }

  protected visitObjectLiteralExpression(
    _node: ts.ObjectLiteralExpression
  ): void {}

  protected visitPropertyAccessExpression(
    node: ts.PropertyAccessExpression
  ): void {
    if (!node.metadata) node.metadata = {};
    this.visit(node.expression);
    let lhs_t = node.expression.metadata?.infer_type;
    if (!lhs_t) {
      throw new InternalError("lhs_t undefined");
    }
    if (!lhs_t.isClassLike())
      return this.e.error(
        node.expression,
        "Cannot access properties of non-object values"
      );
    let rhs = lhs_t.get(node.name.getText());
    if (!rhs)
      return this.e.error(node.name, `Property not found in type ${lhs_t}`);
    if (!rhs.type) return this.e.error(node.name, "WTF");
    node.metadata.infer_type = rhs.type;
  }

  protected visitThisKeyword(
    _node: ts.KeywordToken<ts.SyntaxKind.ThisKeyword>
  ): void {}

  protected visitStringLiteral(node: ts.StringLiteral): void {
    if (!node.metadata) node.metadata = {};
    node.metadata.infer_type = new ty.StringType();
  }

  protected visitArrayLiteralExpression(node: ts.ArrayLiteralExpression): void {
    if (!node.metadata) node.metadata = {};
    let type = new ty.VoidType();
    if (node.elements.length > 0) {
      node.elements.forEach((element, i) => {
        this.visit(element);
        if (!node.metadata) return; // Unreachable
        if (!element.metadata?.infer_type)
          return this.e.error(element, "Unable to infer type of array element");
        if (i != 0 && !type.isCompatibleWith(element.metadata.infer_type)) {
          return this.e.error(
            element,
            "Array elements must have similar type signatures"
          );
        }
        type = element.metadata.infer_type;
        node.metadata.infer_type = new ty.ArrayType(
          element.metadata.infer_type
        );
      });
      return;
    }

    if (ts.isVariableDeclaration(node.parent)) {
      if (!node.parent.type) return;
      node.metadata.infer_type = this.tv.visit(node.parent.type);
    } else {
      node.metadata.infer_type = new ty.ArrayType(new ty.AnyType());
    }
  }

  protected visitEndOfFileToken(_node: ts.EndOfFileToken): void {}

  protected visitElementAccessExpression(
    node: ts.ElementAccessExpression
  ): void {
    if (!node.metadata) node.metadata = {};
    this.visit(node.expression);
    this.visit(node.argumentExpression);
    if (!node.expression.metadata?.infer_type?.isArray())
      return this.e.error(
        node.expression,
        "Cannot access element of non-array type"
      );
    if (!node.argumentExpression.metadata?.infer_type?.isNumber())
      return this.e.error(
        node.argumentExpression,
        "Array accessor must be a number type"
      );
    node.metadata.infer_type = node.expression.metadata.infer_type.element_type;
  }
}
