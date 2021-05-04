import ts from "typescript";
import * as ty from "./types";

export abstract class NewTypeVisitor<T> {
  private _visit(node: ty.Type): T {
    switch (node.kind) {
      case ty.TypeKind.Class:
        return this.visitClassType(node as ty.ClassType);
      case ty.TypeKind.String:
        return this.visitStringType(node as ty.StringType);
      case ty.TypeKind.Number:
        return this.visitNumberType(node as ty.NumberType);
      case ty.TypeKind.Function:
        return this.visitFunctionType(node as ty.FunctionType);
      case ty.TypeKind.Void:
        return this.visitVoidType(node as ty.VoidType);
      case ty.TypeKind.AnonymousFunction:
        return this.visitAnonymousFunctionType(
          node as ty.AnonymousFunctionType
        );
      case ty.TypeKind.Array:
        return this.visitArray(node as ty.ArrayType);
      case ty.TypeKind.Generic:
        return this.visitGeneric(node as ty.GenericContainer);
    }

    throw new Error(`Unhandled type: ${ts.SyntaxKind[node.kind]}`); // TODO: uh...
  }

  get visit() {
    return this._visit.bind(this);
  }

  protected abstract visitClassType(node: ty.ClassType): T;
  protected abstract visitStringType(node: ty.StringType): T;
  protected abstract visitNumberType(node: ty.NumberType): T;
  protected abstract visitFunctionType(node: ty.FunctionType): T;
  protected abstract visitVoidType(node: ty.VoidType): T;
  protected abstract visitArray(node: ty.ArrayType): T;
  protected abstract visitAnonymousFunctionType(
    node: ty.AnonymousFunctionType
  ): T;
  protected abstract visitGeneric(node: ty.GenericContainer): T;
}

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
      case ts.SyntaxKind.StringKeyword:
        return this.visitStringKeyword(
          node as ts.KeywordToken<ts.SyntaxKind.StringKeyword>
        );
      case ts.SyntaxKind.FunctionType:
        return this.visitFunctionTypeNode(node as ts.FunctionTypeNode);
      case ts.SyntaxKind.TypeLiteral:
        return this.visitTypeLiteralNode(node as ts.TypeLiteralNode);
      case ts.SyntaxKind.TypeReference:
        return this.visitTypeReferenceNode(node as ts.TypeReferenceNode);
      case ts.SyntaxKind.ArrayType:
        return this.visitArrayTypeNode(node as ts.ArrayTypeNode);
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
  protected abstract visitArrayTypeNode(node: ts.ArrayTypeNode): T;
  protected abstract visitStringKeyword(
    node: ts.KeywordToken<ts.SyntaxKind.StringKeyword>
  ): T;
}
