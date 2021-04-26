import ts from "typescript";

export abstract class TypeVisitor<T> {
  private _visit(node: ts.TypeNode): T {
    switch (node.kind) {
      case ts.SyntaxKind.NumberKeyword:
        return this.visitNumberKeyword(
          node as ts.KeywordToken<ts.SyntaxKind.NumberKeyword>
        );
      case ts.SyntaxKind.VoidKeyword:
        return this.visitVoidKeyword(
          node as ts.KeywordToken<ts.SyntaxKind.VoidKeyword>
        );
      case ts.SyntaxKind.FunctionType:
        return this.visitFunctionTypeNode(node as ts.FunctionTypeNode);
      case ts.SyntaxKind.TypeLiteral:
        return this.visitTypeLiteralNode(node as ts.TypeLiteralNode);
      case ts.SyntaxKind.TypeReference:
        return this.visitTypeReferenceNode(node as ts.TypeReferenceNode);
    }

    throw new Error(`Unhandled type: ${ts.SyntaxKind[node.kind]}`); // TODO: uh...
  }

  get visit() {
    return this._visit.bind(this);
  }

  protected abstract visitNumberKeyword(
    node: ts.KeywordToken<ts.SyntaxKind.NumberKeyword>
  ): T;
  protected abstract visitFunctionTypeNode(node: ts.FunctionTypeNode): T;
  protected abstract visitVoidKeyword(
    node: ts.KeywordToken<ts.SyntaxKind.VoidKeyword>
  ): T;
  protected abstract visitTypeLiteralNode(node: ts.TypeLiteralNode): T;
  protected abstract visitTypeReferenceNode(node: ts.TypeReferenceNode): T;
}
