import { NodeVisitor } from "./visitor";
import ts from "typescript";
import { Scope } from "./scope";

export interface ClassTypeData {
  members: Map<string, number>;
}

export class InferPass extends NodeVisitor<void> {
  private current_scope: Scope<ts.TypeNode>;
  private class_type_scope: Scope<ClassTypeData>;

  constructor() {
    super();
    this.current_scope = new Scope();
    this.class_type_scope = new Scope();
  }

  private enterScope() {
    this.current_scope = new Scope(this.current_scope);
  }

  private exitScope() {
    this.current_scope = this.current_scope.parent || new Scope();
  }

  protected visitSourceFile(node: ts.SourceFile): void {
    if (!node.metadata) node.metadata = {};
    this.class_type_scope = new Scope();
    this.enterScope();
    node.forEachChild(this.visit);
    this.exitScope();
    node.metadata.class_type_scope = this.class_type_scope;
  }

  protected visitFunctionDeclaration(node: ts.FunctionDeclaration): void {
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
    node.metadata.infer_type = ts.factory.createKeywordTypeNode(
      ts.SyntaxKind.NumberKeyword
    );
  }

  protected visitIdentifier(_node: ts.Identifier): void {}

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
    if (node.initializer && !node.type) {
      this.visit(node.initializer);
      node.metadata.infer_type = node.initializer.metadata?.infer_type;
    } else if (node.type) {
      node.metadata.infer_type = node.type;
    } else {
      // TODO: emit error
      return;
    }
    if (!node.metadata.infer_type) {
      return; // TODO: something else here? is this even reachable?
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
    if (node.operatorToken.kind == ts.SyntaxKind.EqualsToken) {
      node.metadata.infer_type = node.left.metadata?.infer_type;
    } else {
      if (node.left.metadata?.infer_type == node.right.metadata?.infer_type) {
        node.metadata.infer_type = node.left.metadata?.infer_type;
      } else {
        // TODO: emit error
      }
    }
  }

  protected visitPostfixUnaryExpression(node: ts.PostfixUnaryExpression): void {
    if (!node.metadata) node.metadata = {};
    this.visit(node.operand);
    node.metadata.infer_type = node.operand.metadata?.infer_type;
  }

  protected visitCallExpression(node: ts.CallExpression): void {
    node.arguments.forEach(this.visit);
    if (!node.metadata) node.metadata = {};
    if (!ts.isPropertyAccessExpression(node.expression)) return;
    node.metadata.this_passthrough = node.expression.expression;
  }

  protected visitArrowFunction(node: ts.ArrowFunction): void {
    if (node.body) this.visit(node.body);
  }

  protected visitClassDeclaration(node: ts.ClassDeclaration): void {
    if (!node.name) return; // TODO: real error checking
    let data: ClassTypeData = {
      members: new Map(),
    };
    node.members.forEach((member, i) => {
      if (member.kind === ts.SyntaxKind.PropertyDeclaration) {
        let m = member as ts.PropertyDeclaration;
        data.members.set(m.name.getText(), i);
      }
    });
    this.class_type_scope.add(node.name.getText(), data);
  }

  protected visitNewExpression(node: ts.NewExpression): void {
    if (!node.metadata) node.metadata = {};
    let type_ref = ts.factory.createTypeReferenceNode(
      node.expression as ts.Identifier
    );
    node.metadata.infer_type = type_ref;
  }

  protected visitObjectLiteralExpression(
    _node: ts.ObjectLiteralExpression
  ): void {}

  protected visitPropertyAccessExpression(
    _node: ts.PropertyAccessExpression
  ): void {}

  protected visitThisKeyword(
    _node: ts.KeywordToken<ts.SyntaxKind.ThisKeyword>
  ): void {}

  protected visitEndOfFileToken(_node: ts.EndOfFileToken): void {}
}
