import { NodeVisitor } from "./visitor";
import * as cc from "./cpp_factory";
import ts from "typescript";
import { InternalError } from "./err";
import { NewTypeVisitor, TypeVisitor } from "./type_visitor";
import * as ty from "./types";
// import sha1 from "js-sha1";

export class TypeGenPass extends NewTypeVisitor<cc.Type> {
  private factory: cc.Factory;

  constructor(factory: cc.Factory) {
    super();
    this.factory = factory;
  }

  protected visitClassType(node: ty.ClassType): cc.Type {
    return this.factory.createRefType(this.factory.createStructType(node.name));
  }

  protected visitStringType(_node: ty.StringType): cc.Type {
    return this.factory.createRefType(this.factory.createStructType("String"));
  }

  protected visitNumberType(_node: ty.NumberType): cc.Type {
    return this.factory.createIdentType("double");
  }

  protected visitFunctionType(node: ty.FunctionType): cc.Type {
    return this.factory.createFunctionType(
      this.visit(node.return_type),
      node.parameters.map((p) => this.visit(p))
    ); // TODO: add parameters
  }

  protected visitAnonymousFunctionType(
    _node: ty.AnonymousFunctionType
  ): cc.Type {
    throw new InternalError("not yet implemented");
  }

  protected visitArray(node: ty.ArrayType): cc.Type {
    return this.factory.createRefType(
      this.factory.createGenericType(this.factory.createStructType("Array"), [
        this.visit(node.element_type),
      ])
    );
  }

  protected visitGeneric(node: ty.GenericContainer): cc.Type {
    if (!node.evaluated_type) throw new InternalError("Unevaluated generic");
    return this.visit(node.evaluated_type);
  }

  protected visitVoidType(_node: ty.VoidType): cc.Type {
    return this.factory.createIdentType("void");
  }
}

export class CTypeGenPass extends TypeVisitor<cc.Type> {
  private factory: cc.Factory;

  constructor(factory: cc.Factory) {
    super();
    this.factory = factory;
  }

  protected visitNumberKeyword(
    _node: ts.KeywordToken<ts.SyntaxKind.NumberKeyword>
  ): cc.Type {
    return this.factory.createIdentType("double");
  }

  protected visitFunctionTypeNode(node: ts.FunctionTypeNode): cc.Type {
    return this.factory.createFunctionType(this.visit(node.type), []);
  }

  protected visitVoidKeyword(
    _node: ts.KeywordToken<ts.SyntaxKind.VoidKeyword>
  ): cc.Type {
    return this.factory.createIdentType("void");
  }

  protected visitTypeLiteralNode(_node: ts.TypeLiteralNode): cc.Type {
    throw new Error("Method not implemented.");
  }

  protected visitTypeReferenceNode(node: ts.TypeReferenceNode): cc.Type {
    return this.factory.createRefType(
      this.factory.createStructType(node.typeName.getText())
    );
  }

  protected visitStringKeyword(
    _node: ts.KeywordToken<ts.SyntaxKind.StringKeyword>
  ): cc.Type {
    return this.factory.createRefType(this.factory.createStructType("String"));
  }

  protected visitArrayTypeNode(node: ts.ArrayTypeNode): cc.Type {
    // return this.factory.createRefType(this.factory.createStructType("Array"));
    return this.factory.createRefType(
      this.factory.createGenericType(this.factory.createStructType("Array"), [
        this.visit(node.elementType),
      ])
    );
  }
}

export class CGenPass extends NodeVisitor<cc.Node<any> | undefined> {
  private factory: cc.Factory;
  private source_file: cc.SourceFile;
  private ntv: TypeGenPass;
  private tv: CTypeGenPass;
  constructor() {
    super();
    this.source_file = new cc.SourceFile();
    this.factory = new cc.Factory(new cc.SourceFile());
    this.tv = new CTypeGenPass(this.factory);
    this.ntv = new TypeGenPass(this.factory);
  }

  protected visitSourceFile(node: ts.SourceFile): cc.Node<any> {
    this.source_file = new cc.SourceFile();
    this.factory = new cc.Factory(this.source_file);
    this.tv = new CTypeGenPass(this.factory);
    this.ntv = new TypeGenPass(this.factory);
    node.forEachChild((n) => {
      if (n.kind == ts.SyntaxKind.EndOfFileToken) return;
      let tls = this.visit(n);
      if (tls?.isTopLevelStmt()) this.source_file.addTopLevelStmt(tls);
    });
    return this.source_file;
  }

  protected visitFunctionDeclaration(
    node: ts.FunctionDeclaration
  ): cc.Function {
    if (!node.name)
      throw new InternalError("Function is missing name (see previous pass)");
    if (!node.body)
      throw new InternalError("Function is missing body (see previous pass)");
    if (!node.metadata?.infer_type?.isFunction())
      throw new InternalError(
        "Function is missing return type (see previous pass)"
      );
    return this.factory.createFunction(
      0,
      true, // TODO: check for extern
      this.ntv.visit(node.metadata.infer_type.return_type), // TODO: maybe switch this to use NewType
      this.factory.createIdent(node.name.getText()),
      node.parameters.map((param) => {
        if (!param.type) throw new InternalError("Missing param type");
        return [
          this.tv.visit(param.type),
          this.factory.createIdent(param.name.getText()),
        ];
      }),
      this.visitBlock(node.body)
    );
  }

  protected visitBlock(node: ts.Block): cc.Block {
    return this.factory.createBlock(
      node.statements.map((stmt) => {
        let c_stmt = this.visit(stmt);
        if (!c_stmt?.isStmt())
          throw new InternalError(
            "Not a statement (see previous pass)" +
              ts.SyntaxKind[stmt.kind] +
              cc.NodeKind[c_stmt?.kind || 0]
          );
        return c_stmt as cc.Stmt;
      })
    );
  }

  protected visitReturnStatement(node: ts.ReturnStatement): cc.ReturnStmt {
    return this.factory.createReturnStmt(
      node.expression ? (this.visit(node.expression) as cc.Expr) : undefined
    );
  }

  protected visitNumericLiteral(node: ts.NumericLiteral): cc.NumberLiteral {
    return this.factory.createNumberLiteral(node.getText());
  }

  protected visitIdentifier(node: ts.Identifier): cc.IdentLiteral {
    return this.factory.createIdentLiteral(node.getText());
  }

  protected visitVariableStatement(node: ts.VariableStatement): cc.VarDeclStmt {
    return this.visitVariableDeclarationList(node.declarationList);
  }

  protected visitVariableDeclarationList(
    node: ts.VariableDeclarationList
  ): cc.VarDeclStmt {
    // TODO: fix this to account for all
    if (node.getChildCount() !== 2)
      throw new InternalError(
        "Currently only supports one declaration per let/var statement"
      );
    return this.visit(node.declarations[0]) as cc.VarDeclStmt;
  }

  protected visitVariableDeclaration(
    node: ts.VariableDeclaration
  ): cc.VarDeclStmt {
    if (!node.metadata?.infer_type)
      throw new InternalError("Missing type (see previous pass)");
    return this.factory.createVarDeclStmt(
      this.ntv.visit(node.metadata.infer_type),
      this.factory.createIdent(node.name.getText()),
      node.initializer ? (this.visit(node.initializer) as cc.Expr) : undefined
    );
  }

  protected visitIfStatement(node: ts.IfStatement): cc.IfStmt {
    return this.factory.createIfStmt(
      this.visit(node.expression) as cc.Expr,
      this.visit(node.thenStatement) as cc.Stmt,
      node.elseStatement
        ? (this.visit(node.elseStatement) as cc.IfStmt | cc.Block)
        : undefined
    );
  }

  protected visitWhileStatement(node: ts.WhileStatement): cc.WhileStmt {
    return this.factory.createWhileStmt(
      this.visit(node.expression) as cc.Expr,
      this.visit(node.statement) as cc.Stmt
    );
  }

  protected visitForStatement(node: ts.ForStatement): cc.ForStmt {
    if (!node.condition) throw new InternalError("missing for condition");
    return this.factory.createForStmt(
      this.visit(node.condition) as cc.Expr,
      this.visit(node.statement) as cc.Stmt,
      node.initializer ? (this.visit(node.initializer) as cc.Stmt) : undefined,
      node.incrementor ? (this.visit(node.incrementor) as cc.Expr) : undefined
    );
  }

  protected visitExpressionStatement(
    node: ts.ExpressionStatement
  ): cc.ExprStmt {
    return this.factory.createExprStmt(this.visit(node.expression) as cc.Expr);
  }

  protected visitBinaryExpression(node: ts.BinaryExpression): cc.BinaryExpr {
    let lhs = this.visit(node.left);
    let rhs = this.visit(node.right);
    if (!lhs?.isExpr())
      throw new InternalError("Expected lhs to be a value (see previous pass)");
    if (!rhs?.isExpr())
      throw new InternalError("Expected rhs to be a value (see previous pass)");
    let op;
    switch (node.operatorToken.kind) {
      case ts.SyntaxKind.PlusToken:
        op = cc.TokenKind.Plus;
        break;
      case ts.SyntaxKind.MinusToken:
        op = cc.TokenKind.Minus;
        break;
      case ts.SyntaxKind.AsteriskToken:
        op = cc.TokenKind.Asterisk;
        break;
      case ts.SyntaxKind.SlashToken:
        op = cc.TokenKind.Slash;
        break;
      case ts.SyntaxKind.PercentToken:
        op = cc.TokenKind.Percent;
        break;
      case ts.SyntaxKind.PercentToken:
        op = cc.TokenKind.Percent;
        break;
      case ts.SyntaxKind.CaretToken:
        op = cc.TokenKind.Carat;
        break;
      case ts.SyntaxKind.PlusEqualsToken:
        op = cc.TokenKind.PlusEquals;
        break;
      case ts.SyntaxKind.MinusEqualsToken:
        op = cc.TokenKind.MinusEquals;
        break;
      case ts.SyntaxKind.AsteriskEqualsToken:
        op = cc.TokenKind.AsteriskEquals;
        break;
      case ts.SyntaxKind.SlashEqualsToken:
        op = cc.TokenKind.SlashEquals;
        break;
      case ts.SyntaxKind.PercentEqualsToken:
        op = cc.TokenKind.PercentEquals;
        break;
      case ts.SyntaxKind.PercentEqualsToken:
        op = cc.TokenKind.PercentEquals;
        break;
      case ts.SyntaxKind.CaretEqualsToken:
        op = cc.TokenKind.CaratEquals;
        break;
      case ts.SyntaxKind.LessThanToken:
        op = cc.TokenKind.Less;
        break;
      case ts.SyntaxKind.GreaterThanToken:
        op = cc.TokenKind.Greater;
        break;
      case ts.SyntaxKind.LessThanEqualsToken:
        op = cc.TokenKind.LessEquals;
        break;
      case ts.SyntaxKind.GreaterThanEqualsToken:
        op = cc.TokenKind.GreaterEquals;
        break;
      case ts.SyntaxKind.EqualsEqualsToken:
        op = cc.TokenKind.EqualsEquals;
        break;
      case ts.SyntaxKind.EqualsToken:
        op = cc.TokenKind.Equals;
        break;
      default:
        throw new InternalError(
          "Unhandled operator " + node.operatorToken.kind
        );
    }
    if (!cc.isBinaryOperator(op)) throw new InternalError("I done goofed");
    return this.factory.createBinaryExpr(lhs as cc.Expr, op, rhs as cc.Expr);
  }

  protected visitPostfixUnaryExpression(
    _node: ts.PostfixUnaryExpression
  ): undefined {
    return undefined;
  }

  protected visitCallExpression(node: ts.CallExpression): cc.CallExpr {
    if (!node.metadata?.func_type?.isFunction())
      throw new InternalError(
        "Expected function type" + node.metadata?.func_type
      );
    let args = node.arguments.map((expr) => {
      let v = this.visit(expr) as cc.Expr;
      return v;
    });
    return this.factory.createCallExpr(
      this.visit(node.expression) as cc.Expr,
      args,
      node.metadata?.func_type.generics.map((generic) =>
        this.ntv.visit(generic)
      )
    );
  }

  protected visitArrowFunction(node: ts.ArrowFunction): cc.LambdaExpr {
    if (!node.body)
      throw new InternalError("Function is missing body (see previous pass)");
    if (!node.metadata?.infer_type?.isFunction())
      throw new InternalError(
        "Function is missing return type (see previous pass)"
      );
    let body;
    if (ts.isBlock(node.body)) {
      body = this.visitBlock(node.body);
    } else {
      body = this.factory.createBlock([
        this.factory.createReturnStmt(this.visit(node.body) as cc.Expr),
      ]);
    }
    return this.factory.createLambdaExpr(
      this.ntv.visit(node.metadata.infer_type.return_type),
      node.parameters.map((param) => {
        if (!param.type) throw new InternalError("Missing param type");
        return [
          this.tv.visit(param.type),
          this.factory.createIdent(param.name.getText()),
        ];
      }),
      body
    );
  }

  protected visitObjectLiteralExpression(
    _node: ts.ObjectLiteralExpression
  ): undefined {
    return undefined;
  }

  private createMethod(
    class_name: string,
    node: ts.MethodDeclaration
  ): cc.ClassMember {
    if (!node.body)
      throw new InternalError("Function is missing body (see previous pass)");
    if (!node.type)
      throw new InternalError(
        "Function is missing return type (see previous pass)"
      );

    let params: [cc.Type, cc.Ident][] = node.parameters.map((param) => {
      if (!param.type) throw new InternalError("Missing param type");
      return [
        this.tv.visit(param.type),
        this.factory.createIdent(param.name.getText()),
      ];
    });

    let body;
    if (ts.isBlock(node.body)) {
      body = this.visitBlock(node.body);
    } else {
      body = this.factory.createBlock([
        this.factory.createReturnStmt(this.visit(node.body) as cc.Expr),
      ]);
    }

    return new cc.ClassMethod(
      0,
      this.tv.visit(node.type),
      this.factory.createIdent(class_name),
      this.factory.createIdent(node.name.getText()),
      params,
      body
    );
  }

  private createConstructor(
    self: ts.ConstructorDeclaration,
    node: ts.ClassDeclaration
  ): cc.ClassMember {
    if (!node.name)
      throw new InternalError(
        "Expected class to have name (see previous pass)"
      );
    if (!self.body)
      throw new InternalError("Expected constructor to have body");

    let params: [cc.Type, cc.Ident][] = self.parameters.map((param) => {
      if (!param.type)
        throw new InternalError("Param must have type (see previous pass)");
      return [
        this.tv.visit(param.type),
        this.factory.createIdent(param.name.getText()),
      ];
    });

    return new cc.ClassConstructor(
      0,
      this.factory.createIdent(node.name.getText()),
      params,
      this.visit(self.body) as cc.Block
    );
  }

  protected visitClassDeclaration(node: ts.ClassDeclaration): undefined {
    if (!node.name)
      throw new InternalError(
        "Expected class to have name (see previous pass)"
      );
    let members: cc.ClassMember[] = [];
    node.members.forEach((member) => {
      if (ts.isPropertyDeclaration(member)) {
        let prop = member as ts.PropertyDeclaration;
        if (!prop.type)
          throw new InternalError("expected property to have type");
        members.push(
          new cc.ClassFieldMember(
            this.tv.visit(prop.type),
            this.factory.createIdent(prop.name.getText())
          )
        );
      } else if (ts.isMethodDeclaration(member)) {
        members.push(
          this.createMethod((node.name as ts.Identifier).getText(), member)
        );
      } else if (member.kind === ts.SyntaxKind.Constructor) {
        members.push(
          this.createConstructor(member as ts.ConstructorDeclaration, node)
        );
      } else {
        throw new InternalError("unhandled class member");
      }
    });
    this.source_file.addTopLevelStmt(
      this.factory.createClassDecl(
        this.factory.createIdent(node.name.getText()),
        members
      )
    );
    return undefined;
    // return this.createConstructor(node);
  }

  protected visitNewExpression(node: ts.NewExpression): cc.CallExpr {
    let args: cc.Expr[] = [];
    if (node.arguments)
      args = node.arguments.map((expr) => this.visit(expr) as cc.Expr);
    return this.factory.createCallExpr(
      this.factory.createBinaryExpr(
        this.factory.createIdentLiteral("std"),
        cc.TokenKind.ColonColon,
        this.factory.createIdentLiteral("make_shared")
      ),
      args,
      [this.factory.createIdentType(node.expression.getText())]
    );
  }

  protected visitPropertyAccessExpression(
    node: ts.PropertyAccessExpression
  ): cc.BinaryExpr {
    let lhs = this.visit(node.expression);
    let rhs = this.visit(node.name);
    if (!lhs?.isExpr())
      throw new InternalError("Expected lhs to be a value (see previous pass)");
    if (!rhs?.isExpr())
      throw new InternalError("Expected rhs to be a value (see previous pass)");
    return this.factory.createBinaryExpr(
      lhs as cc.Expr,
      cc.TokenKind.MinusGreater,
      rhs as cc.Expr
    );
  }

  protected visitThisKeyword(
    _node: ts.KeywordToken<ts.SyntaxKind.ThisKeyword>
  ): cc.IdentLiteral {
    return this.factory.createIdentLiteral("this");
  }
  protected visitStringLiteral(node: ts.StringLiteral): cc.CallExpr {
    return this.factory.createCallExpr(
      this.factory.createBinaryExpr(
        this.factory.createIdentLiteral("std"),
        cc.TokenKind.ColonColon,
        this.factory.createIdentLiteral("make_shared")
      ),
      [this.factory.createStringLiteral(node.getText())],
      [this.factory.createStructType("String")]
    );
  }

  protected visitArrayLiteralExpression(
    node: ts.ArrayLiteralExpression
  ): cc.CallExpr {
    if (!node.metadata?.infer_type?.isArray())
      throw new InternalError("Missing infer type (see previous pass)");
    let params: cc.Expr[] = [];
    if (node.elements.length > 0) {
      params = [
        this.factory.createInitializerListExpr(
          this.ntv.visit(node.metadata.infer_type.element_type),
          node.elements.map((el) => this.visit(el) as cc.Expr)
        ),
      ];
    }
    return this.factory.createCallExpr(
      this.factory.createBinaryExpr(
        this.factory.createIdentLiteral("std"),
        cc.TokenKind.ColonColon,
        this.factory.createIdentLiteral("make_shared")
      ),
      params,
      [(this.ntv.visit(node.metadata.infer_type) as cc.RefType).element_type]
    );
  }

  protected visitEndOfFileToken(_node: ts.EndOfFileToken): undefined {
    return undefined;
  }

  protected visitElementAccessExpression(
    node: ts.ElementAccessExpression
  ): cc.Expr {
    let arr = this.visit(node.expression);
    if (!arr) throw new InternalError("arr must be a value");
    let accessor = this.visit(node.argumentExpression);
    if (!accessor) throw new InternalError("accessor must be a value");
    if (!node.metadata?.infer_type)
      throw new InternalError("un-inferred type (see previous pass)");
    return this.factory.createArrayAccess(
      this.factory.createUnaryExpr(cc.TokenKind.Asterisk, arr as cc.Expr),
      accessor as cc.Expr
    );
  }
}
