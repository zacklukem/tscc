import ts from "typescript";

export abstract class NodeVisitor<T> {
  private _visit(node: ts.Node): T {
    switch (node.kind) {
      case ts.SyntaxKind.SourceFile:
        return this.visitSourceFile(node as ts.SourceFile);
      case ts.SyntaxKind.FunctionDeclaration:
        return this.visitFunctionDeclaration(node as ts.FunctionDeclaration);
      case ts.SyntaxKind.Block:
        return this.visitBlock(node as ts.Block);
      case ts.SyntaxKind.ReturnStatement:
        return this.visitReturnStatement(node as ts.ReturnStatement);
      case ts.SyntaxKind.NumericLiteral:
        return this.visitNumericLiteral(node as ts.NumericLiteral);
      case ts.SyntaxKind.TrueKeyword:
      case ts.SyntaxKind.FalseKeyword:
        return this.visitBooleanLiteral(node as ts.BooleanLiteral);
      case ts.SyntaxKind.Identifier:
        return this.visitIdentifier(node as ts.Identifier);
      case ts.SyntaxKind.VariableStatement:
        return this.visitVariableStatement(node as ts.VariableStatement);
      case ts.SyntaxKind.VariableDeclarationList:
        return this.visitVariableDeclarationList(
          node as ts.VariableDeclarationList
        );
      case ts.SyntaxKind.VariableDeclaration:
        return this.visitVariableDeclaration(node as ts.VariableDeclaration);
      case ts.SyntaxKind.IfStatement:
        return this.visitIfStatement(node as ts.IfStatement);
      case ts.SyntaxKind.WhileStatement:
        return this.visitWhileStatement(node as ts.WhileStatement);
      case ts.SyntaxKind.ForStatement:
        return this.visitForStatement(node as ts.ForStatement);
      case ts.SyntaxKind.ExpressionStatement:
        return this.visitExpressionStatement(node as ts.ExpressionStatement);
      case ts.SyntaxKind.BinaryExpression:
        return this.visitBinaryExpression(node as ts.BinaryExpression);
      case ts.SyntaxKind.PostfixUnaryExpression:
        return this.visitPostfixUnaryExpression(
          node as ts.PostfixUnaryExpression
        );
      case ts.SyntaxKind.CallExpression:
        return this.visitCallExpression(node as ts.CallExpression);
      case ts.SyntaxKind.ArrowFunction:
        return this.visitArrowFunction(node as ts.ArrowFunction);
      case ts.SyntaxKind.ObjectLiteralExpression:
        return this.visitObjectLiteralExpression(
          node as ts.ObjectLiteralExpression
        );
      case ts.SyntaxKind.ClassDeclaration:
        return this.visitClassDeclaration(node as ts.ClassDeclaration);
      case ts.SyntaxKind.NewExpression:
        return this.visitNewExpression(node as ts.NewExpression);
      case ts.SyntaxKind.PropertyAccessExpression:
        return this.visitPropertyAccessExpression(
          node as ts.PropertyAccessExpression
        );
      case ts.SyntaxKind.ThisKeyword:
        return this.visitThisKeyword(
          node as ts.KeywordToken<ts.SyntaxKind.ThisKeyword>
        );
      case ts.SyntaxKind.StringLiteral:
        return this.visitStringLiteral(node as ts.StringLiteral);
      case ts.SyntaxKind.ArrayLiteralExpression:
        return this.visitArrayLiteralExpression(
          node as ts.ArrayLiteralExpression
        );
      case ts.SyntaxKind.EndOfFileToken:
        return this.visitEndOfFileToken(node as ts.EndOfFileToken);
      case ts.SyntaxKind.ElementAccessExpression:
        return this.visitElementAccessExpression(
          node as ts.ElementAccessExpression
        );
    }
    throw new Error(
      `Unhandled type: ${ts.SyntaxKind[node.kind]} = ${node.kind}`
    ); // TODO: uh...
  }

  public get visit() {
    return this._visit.bind(this);
  }

  protected abstract visitSourceFile(node: ts.SourceFile): T;
  protected abstract visitFunctionDeclaration(node: ts.FunctionDeclaration): T;
  protected abstract visitBlock(node: ts.Block): T;
  protected abstract visitReturnStatement(node: ts.ReturnStatement): T;
  protected abstract visitNumericLiteral(node: ts.NumericLiteral): T;
  protected abstract visitBooleanLiteral(node: ts.BooleanLiteral): T;
  protected abstract visitIdentifier(node: ts.Identifier): T;
  protected abstract visitVariableStatement(node: ts.VariableStatement): T;
  protected abstract visitVariableDeclarationList(
    node: ts.VariableDeclarationList
  ): T;
  protected abstract visitVariableDeclaration(node: ts.VariableDeclaration): T;
  protected abstract visitIfStatement(node: ts.IfStatement): T;
  protected abstract visitWhileStatement(node: ts.WhileStatement): T;
  protected abstract visitForStatement(node: ts.ForStatement): T;
  protected abstract visitExpressionStatement(node: ts.ExpressionStatement): T;
  protected abstract visitBinaryExpression(node: ts.BinaryExpression): T;
  protected abstract visitPostfixUnaryExpression(
    node: ts.PostfixUnaryExpression
  ): T;
  protected abstract visitCallExpression(node: ts.CallExpression): T;
  protected abstract visitArrowFunction(node: ts.ArrowFunction): T;
  protected abstract visitObjectLiteralExpression(
    node: ts.ObjectLiteralExpression
  ): T;
  protected abstract visitClassDeclaration(node: ts.ClassDeclaration): T;
  protected abstract visitNewExpression(node: ts.NewExpression): T;
  protected abstract visitPropertyAccessExpression(
    node: ts.PropertyAccessExpression
  ): T;
  protected abstract visitThisKeyword(
    node: ts.KeywordToken<ts.SyntaxKind.ThisKeyword>
  ): T;
  protected abstract visitStringLiteral(node: ts.StringLiteral): T;
  protected abstract visitEndOfFileToken(node: ts.EndOfFileToken): T;
  protected abstract visitArrayLiteralExpression(
    node: ts.ArrayLiteralExpression
  ): T;
  protected abstract visitElementAccessExpression(
    node: ts.ElementAccessExpression
  ): T;
}
