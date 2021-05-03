import { NodeVisitor } from "./visitor";
import * as c from "./c_factory";
import ts from "typescript";
import { InternalError } from "./err";
import { NewTypeVisitor, TypeVisitor } from "./type_visitor";
import * as ty from "./types";
import sha1 from "js-sha1";

export class TypeGenPass extends NewTypeVisitor<c.Type> {
  private factory: c.Factory;

  constructor(factory: c.Factory) {
    super();
    this.factory = factory;
  }


  protected visitClassType(node: ty.ClassType): c.Type {
    return this.factory.createRefType(this.factory.createStructType(node.name));
  }

  protected visitStringType(_node: ty.StringType): c.Type {
    return this.factory.createRefType(this.factory.createStructType("String"));
  }

  protected visitNumberType(_node: ty.NumberType): c.Type {
    return this.factory.createIdentType("double");
  }

  protected visitFunctionType(node: ty.FunctionType): c.Type {
    let ret_type = this.visit(node.return_type);
    let name =
      "_" +
      ret_type.gen().replace(/[^A-Za-z0-9]/g, "") +
      "_" +
      node.sha?.substr(0, 10);
    this.factory.src.addTopLevelStmt(
      this.factory.createTypeDef(ret_type, this.factory.createIdent(name), [])
    );
    return this.factory.createIdentType(name);
  }

  protected visitAnonymousFunctionType(
    _node: ty.AnonymousFunctionType
  ): c.Type {
    throw new InternalError("not yet implemented");
  }

  protected visitArray(_node: ty.ArrayType): c.Type {
    return this.factory.createRefType(this.factory.createStructType("Array"));
  }

  protected visitVoidType(_node: ty.VoidType): c.Type {
    return this.factory.createIdentType("void");
  }
}

export class CTypeGenPass extends TypeVisitor<c.Type> {
  private factory: c.Factory;

  constructor(factory: c.Factory) {
    super();
    this.factory = factory;
  }

  protected visitNumberKeyword(
    _node: ts.KeywordToken<ts.SyntaxKind.NumberKeyword>
  ): c.Type {
    return this.factory.createIdentType("double");
  }

  protected visitFunctionTypeNode(node: ts.FunctionTypeNode): c.Type {
    let ret_type = this.visit(node.type);
    let name =
      "_" +
      ret_type.gen().replace(/[^A-Za-z0-9]/g, "") +
      "_" +
      sha1(node.getText()).substr(0, 10);
    this.factory.src.addTopLevelStmt(
      this.factory.createTypeDef(ret_type, this.factory.createIdent(name), [])
    );
    return this.factory.createIdentType(name);
  }

  protected visitVoidKeyword(
    _node: ts.KeywordToken<ts.SyntaxKind.VoidKeyword>
  ): c.Type {
    return this.factory.createIdentType("void");
  }

  protected visitTypeLiteralNode(_node: ts.TypeLiteralNode): c.Type {
    throw new Error("Method not implemented.");
  }

  protected visitTypeReferenceNode(node: ts.TypeReferenceNode): c.Type {
    return this.factory.createRefType(
      this.factory.createStructType(node.typeName.getText())
    );
  }

  protected visitStringKeyword(_node: ts.KeywordToken<ts.SyntaxKind.StringKeyword>): c.Type {
    return this.factory.createRefType(this.factory.createStructType("String"));
  }

  protected visitArrayTypeNode(_node: ts.ArrayTypeNode): c.Type {
    return this.factory.createRefType(this.factory.createStructType("Array"));
  }
}

export class CGenPass extends NodeVisitor<c.Node<any> | undefined> {
  private factory: c.Factory;
  private source_file: c.SourceFile;
  private ntv: TypeGenPass;
  private tv: CTypeGenPass;
  constructor() {
    super();
    this.source_file = new c.SourceFile();
    this.factory = new c.Factory(new c.SourceFile());
    this.tv = new CTypeGenPass(this.factory);
    this.ntv = new TypeGenPass(this.factory);
  }

  protected visitSourceFile(node: ts.SourceFile): c.Node<any> {
    this.source_file = new c.SourceFile();
    this.factory = new c.Factory(this.source_file);
    this.tv = new CTypeGenPass(this.factory);
    this.ntv = new TypeGenPass(this.factory);
    node.forEachChild((n) => {
      if (n.kind == ts.SyntaxKind.EndOfFileToken) return;
      let tls = this.visit(n);
      if (!tls?.isTopLevelStmt())
        throw new InternalError(
          "Not a top level statement" + ts.SyntaxKind[n.kind]
        );
      this.source_file.addTopLevelStmt(tls);
    });
    return this.source_file;
  }

  protected visitFunctionDeclaration(node: ts.FunctionDeclaration): c.Function {
    if (!node.name)
      throw new InternalError("Function is missing name (see previous pass)");
    if (!node.body)
      throw new InternalError("Function is missing body (see previous pass)");
    if (!node.type)
      throw new InternalError(
        "Function is missing return type (see previous pass)"
      );
    return this.factory.createFunction(
      0,
      true, // TODO: check for extern
      this.tv.visit(node.type), // TODO: maybe switch this to use NewType
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

  protected visitBlock(node: ts.Block): c.Block {
    return this.factory.createBlock(
      node.statements.map((stmt) => {
        let c_stmt = this.visit(stmt);
        if (!c_stmt?.isStmt())
          throw new InternalError(
            "Not a statement (see previous pass)" +
              ts.SyntaxKind[stmt.kind] +
              c.NodeKind[c_stmt?.kind || 0]
          );
        return c_stmt as c.Stmt;
      })
    );
  }

  protected visitReturnStatement(node: ts.ReturnStatement): c.ReturnStmt {
    return this.factory.createReturnStmt(
      node.expression ? (this.visit(node.expression) as c.Expr) : undefined
    );
  }

  protected visitNumericLiteral(node: ts.NumericLiteral): c.NumberLiteral {
    return this.factory.createNumberLiteral(node.getText());
  }

  protected visitIdentifier(node: ts.Identifier): c.IdentLiteral {
    return this.factory.createIdentLiteral(node.getText());
  }

  protected visitVariableStatement(node: ts.VariableStatement): c.VarDeclStmt {
    return this.visitVariableDeclarationList(node.declarationList);
  }

  protected visitVariableDeclarationList(
    node: ts.VariableDeclarationList
  ): c.VarDeclStmt {
    // TODO: fix this to account for all
    if (node.getChildCount() !== 2)
      throw new InternalError(
        "Currently only supports one declaration per let/var statement"
      );
    return this.visit(node.declarations[0]) as c.VarDeclStmt;
  }

  protected visitVariableDeclaration(
    node: ts.VariableDeclaration
  ): c.VarDeclStmt {
    if (!node.metadata?.infer_type)
      throw new InternalError("Missing type (see previous pass)");
    return this.factory.createVarDeclStmt(
      this.ntv.visit(node.metadata.infer_type),
      this.factory.createIdent(node.name.getText()),
      node.initializer ? (this.visit(node.initializer) as c.Expr) : undefined
    );
  }

  protected visitIfStatement(node: ts.IfStatement): c.IfStmt {
    return this.factory.createIfStmt(
      this.visit(node.expression) as c.Expr,
      this.visit(node.thenStatement) as c.Stmt,
      node.elseStatement
        ? (this.visit(node.elseStatement) as c.IfStmt | c.Block)
        : undefined
    );
  }

  protected visitWhileStatement(node: ts.WhileStatement): c.WhileStmt {
    return this.factory.createWhileStmt(
      this.visit(node.expression) as c.Expr,
      this.visit(node.statement) as c.Stmt
    );
  }

  protected visitForStatement(node: ts.ForStatement): c.ForStmt {
    if (!node.condition) throw new InternalError("missing for condition");
    return this.factory.createForStmt(
      this.visit(node.condition) as c.Expr,
      this.visit(node.statement) as c.Stmt,
      node.initializer ? (this.visit(node.initializer) as c.Stmt) : undefined,
      node.incrementor ? (this.visit(node.incrementor) as c.Expr) : undefined
    );
  }

  protected visitExpressionStatement(node: ts.ExpressionStatement): c.ExprStmt {
    return this.factory.createExprStmt(this.visit(node.expression) as c.Expr);
  }

  protected visitBinaryExpression(node: ts.BinaryExpression): c.BinaryExpr {
    let lhs = this.visit(node.left);
    let rhs = this.visit(node.right);
    if (!lhs?.isExpr())
      throw new InternalError("Expected lhs to be a value (see previous pass)");
    if (!rhs?.isExpr())
      throw new InternalError("Expected rhs to be a value (see previous pass)");
    let op;
    switch (node.operatorToken.kind) {
      case ts.SyntaxKind.PlusToken:
        op = c.TokenKind.Plus;
        break;
      case ts.SyntaxKind.MinusToken:
        op = c.TokenKind.Minus;
        break;
      case ts.SyntaxKind.AsteriskToken:
        op = c.TokenKind.Asterisk;
        break;
      case ts.SyntaxKind.SlashToken:
        op = c.TokenKind.Slash;
        break;
      case ts.SyntaxKind.PercentToken:
        op = c.TokenKind.Percent;
        break;
      case ts.SyntaxKind.PercentToken:
        op = c.TokenKind.Percent;
        break;
      case ts.SyntaxKind.CaretToken:
        op = c.TokenKind.Carat;
        break;
      case ts.SyntaxKind.PlusEqualsToken:
        op = c.TokenKind.PlusEquals;
        break;
      case ts.SyntaxKind.MinusEqualsToken:
        op = c.TokenKind.MinusEquals;
        break;
      case ts.SyntaxKind.AsteriskEqualsToken:
        op = c.TokenKind.AsteriskEquals;
        break;
      case ts.SyntaxKind.SlashEqualsToken:
        op = c.TokenKind.SlashEquals;
        break;
      case ts.SyntaxKind.PercentEqualsToken:
        op = c.TokenKind.PercentEquals;
        break;
      case ts.SyntaxKind.PercentEqualsToken:
        op = c.TokenKind.PercentEquals;
        break;
      case ts.SyntaxKind.CaretEqualsToken:
        op = c.TokenKind.CaratEquals;
        break;
      case ts.SyntaxKind.LessThanToken:
        op = c.TokenKind.Less;
        break;
      case ts.SyntaxKind.GreaterThanToken:
        op = c.TokenKind.Greater;
        break;
      case ts.SyntaxKind.LessThanEqualsToken:
        op = c.TokenKind.LessEquals;
        break;
      case ts.SyntaxKind.GreaterThanEqualsToken:
        op = c.TokenKind.GreaterEquals;
        break;
      case ts.SyntaxKind.EqualsEqualsToken:
        op = c.TokenKind.EqualsEquals;
        break;
      case ts.SyntaxKind.EqualsToken:
        op = c.TokenKind.Equals;
        break;
      default:
        throw new InternalError(
          "Unhandled operator " + node.operatorToken.kind
        );
    }
    if (!c.isBinaryOperator(op)) throw new InternalError("I done goofed");
    return this.factory.createBinaryExpr(lhs as c.Expr, op, rhs as c.Expr);
  }

  protected visitPostfixUnaryExpression(
    _node: ts.PostfixUnaryExpression
  ): undefined {
    return undefined;
  }

  protected visitCallExpression(node: ts.CallExpression): c.CallExpr {
    let args = node.arguments.map((expr) => {
      let v = this.visit(expr) as c.Expr;
      if (expr.metadata?.bitcast)
        v = this.factory.createCallExpr(
          this.factory.createIdentLiteral(
            "__internal__f64_to_u64"
          ),
          [v]
        );
      if (expr.metadata?.cast_to)
        v = this.factory.createCallExpr(
          this.factory.createIdentLiteral(
            expr.metadata.cast_to + "_constructor"
          ),
          [v]
        );
      return v;
    });
    if (node.metadata?.this_passthrough) {
      args.unshift(this.visit(node.metadata.this_passthrough) as c.Expr);
    }
    return this.factory.createCallExpr(
      this.visit(node.expression) as c.Expr,
      args
    );
  }

  protected visitArrowFunction(node: ts.ArrowFunction): c.IdentLiteral {
    if (!node.body)
      throw new InternalError("Function is missing body (see previous pass)");
    if (!node.type)
      throw new InternalError(
        "Function is missing return type (see previous pass)"
      );
    let body;
    if (ts.isBlock(node.body)) {
      body = this.visitBlock(node.body);
    } else {
      body = this.factory.createBlock([
        this.factory.createReturnStmt(this.visit(node.body) as c.Expr),
      ]);
    }
    let name = "_" + sha1(node.getText()).substr(0, 10);
    let func = this.factory.createFunction(
      0,
      false, // TODO: check for extern
      this.tv.visit(node.type), // TODO: perhaps use new types
      this.factory.createIdent(name),
      node.parameters.map((param) => {
        if (!param.type) throw new InternalError("Missing param type");
        return [
          this.tv.visit(param.type),
          this.factory.createIdent(param.name.getText()),
        ];
      }),
      body
    );
    this.source_file.addTopLevelStmt(func);
    return this.factory.createIdentLiteral(name);
  }

  protected visitObjectLiteralExpression(
    _node: ts.ObjectLiteralExpression
  ): undefined {
    return undefined;
  }

  private createMethod(
    class_name: string,
    node: ts.MethodDeclaration
  ): [c.Type, c.Ident] {
    if (!node.body)
      throw new InternalError("Function is missing body (see previous pass)");
    if (!node.type)
      throw new InternalError(
        "Function is missing return type (see previous pass)"
      );
    let this_type = this.factory.createRefType(
      this.factory.createStructType(class_name)
    );
    let params: [c.Type, c.Ident][] = node.parameters.map((param) => {
      if (!param.type) throw new InternalError("Missing param type");
      return [
        this.tv.visit(param.type),
        this.factory.createIdent(param.name.getText()),
      ];
    });
    params.unshift([this_type, this.factory.createIdent("this")]);
    let name = class_name + "_" + node.name.getText();
    let ret_type = this.tv.visit(node.type);
    let type_name = "_" + name + "_t";
    this.factory.src.addTopLevelStmt(
      this.factory.createTypeDef(
        ret_type,
        this.factory.createIdent(type_name),
        params
      )
    );
    let f_type = this.factory.createIdentType(type_name);

    let body;
    if (ts.isBlock(node.body)) {
      body = this.visitBlock(node.body);
    } else {
      body = this.factory.createBlock([
        this.factory.createReturnStmt(this.visit(node.body) as c.Expr),
      ]);
    }
    let func = this.factory.createFunction(
      0,
      false, // TODO: check for extern
      this.tv.visit(node.type),
      this.factory.createIdent(name),
      params,
      body
    );
    this.source_file.addTopLevelStmt(func);
    return [f_type, this.factory.createIdent(node.name.getText())];
  }

  private createConstructor(node: ts.ClassDeclaration): c.Function {
    if (!node.name)
      throw new InternalError(
        "Expected class to have name (see previous pass)"
      );
    let constructor_ret_type = this.factory.createRefType(
      this.factory.createStructType(node.name.getText())
    );
    // generates: return c_intrinsic_alloc_rc(sizeof(ClassName_t));
    let constructor_body: c.Stmt[] = [
      this.factory.createVarDeclStmt(
        constructor_ret_type,
        this.factory.createIdent("this"),
        this.factory.createCallExpr(
          this.factory.createIdentLiteral("c_intrinsic_alloc_rc"),
          [
            this.factory.createCallExpr(
              this.factory.createIdentLiteral("sizeof"),
              [this.factory.createIdentLiteral(node.name.getText() + "_t")]
            ),
          ]
        )
      ),
    ];
    let params: [c.Type, c.Ident][] = [];
    let ret_val_lit = this.factory.createIdentLiteral("this");
    node.members.forEach((member) => {
      if (ts.isPropertyDeclaration(member)) {
        if (member.initializer) {
          constructor_body.push(
            this.factory.createBinaryExpr(
              this.factory.createBinaryExpr(
                ret_val_lit,
                c.TokenKind.MinusGreater,
                this.factory.createIdentLiteral(member.name.getText())
              ),
              c.TokenKind.Equals,
              this.visit(member.initializer) as c.Expr
            )
          );
        }
      } else if (ts.isMethodDeclaration(member)) {
        constructor_body.push(
          this.factory.createExprStmt(
            this.factory.createBinaryExpr(
              this.factory.createBinaryExpr(
                ret_val_lit,
                c.TokenKind.MinusGreater,
                this.factory.createIdentLiteral(member.name.getText())
              ),
              c.TokenKind.Equals,
              this.factory.createIdentLiteral(
                node.name?.getText() + "_" + member.name.getText()
              )
            )
          )
        );
      } else if (member.kind === ts.SyntaxKind.Constructor) {
        let member_c = member as ts.ConstructorDeclaration;
        if (!member_c.body)
          throw new InternalError("Expected constructor to have body");
        member_c.parameters.forEach((param) => {
          if (!param.type) throw new InternalError("Missing param type");
          params.push([
            this.tv.visit(param.type),
            this.factory.createIdent(param.name.getText()),
          ]);
        });
        constructor_body.push(this.visit(member_c.body) as c.Block);
      }
    });
    constructor_body.push(this.factory.createReturnStmt(ret_val_lit));
    return this.factory.createFunction(
      0,
      false,
      constructor_ret_type,
      this.factory.createIdent(node.name.getText() + "_constructor"),
      params, // todo: params
      this.factory.createBlock(constructor_body)
    );
  }

  protected visitClassDeclaration(node: ts.ClassDeclaration): c.Function {
    if (!node.name)
      throw new InternalError(
        "Expected class to have name (see previous pass)"
      );
    let members: [c.Type, c.Ident][] = [];
    node.members.forEach((member) => {
      if (ts.isPropertyDeclaration(member)) {
        let prop = member as ts.PropertyDeclaration;
        if (!prop.type)
          throw new InternalError("expected property to have type");
        members.push([
          this.tv.visit(prop.type),
          this.factory.createIdent(prop.name.getText()),
        ]);
      } else if (ts.isMethodDeclaration(member)) {
        // Weird tsc bug? is this expected behavior? (node.name is an optional)
        members.push(
          this.createMethod((node.name as ts.Identifier).getText(), member)
        );
      } else if (member.kind === ts.SyntaxKind.Constructor) {
        // ignore
      } else {
        throw new InternalError("unhandled class member");
      }
    });
    this.source_file.addTopLevelStmt(
      this.factory.createStruct(
        this.factory.createIdent(node.name.getText()),
        members
      )
    );
    return this.createConstructor(node);
  }

  protected visitNewExpression(node: ts.NewExpression): c.CallExpr {
    let args: c.Expr[] = [];
    if (node.arguments)
      args = node.arguments.map((expr) => this.visit(expr) as c.Expr);
    return this.factory.createCallExpr(
      this.factory.createIdentLiteral(
        node.expression.getText() + "_constructor"
      ),
      args
    );
  }

  protected visitPropertyAccessExpression(
    node: ts.PropertyAccessExpression
  ): c.BinaryExpr {
    let lhs = this.visit(node.expression);
    let rhs = this.visit(node.name);
    if (!lhs?.isExpr())
      throw new InternalError("Expected lhs to be a value (see previous pass)");
    if (!rhs?.isExpr())
      throw new InternalError("Expected rhs to be a value (see previous pass)");
    return this.factory.createBinaryExpr(
      lhs as c.Expr,
      c.TokenKind.MinusGreater,
      rhs as c.Expr
    );
  }

  protected visitThisKeyword(
    _node: ts.KeywordToken<ts.SyntaxKind.ThisKeyword>
  ): c.IdentLiteral {
    return this.factory.createIdentLiteral("this");
  }
  protected visitStringLiteral(node: ts.StringLiteral): c.CallExpr {
    return this.factory.createCallExpr(
      this.factory.createIdentLiteral("String_constructor"),
      [this.factory.createStringLiteral(node.getText())]
    );
  }

  protected visitArrayLiteralExpression(
    node: ts.ArrayLiteralExpression
  ): c.CallExpr {
    if (!node.metadata?.infer_type?.isArray())
      throw new InternalError("Missing infer type (see previous pass)");
    return this.factory.createCallExpr(
      this.factory.createIdentLiteral("Array_constructor"),
      [
        this.factory.createCallExpr(this.factory.createIdentLiteral("sizeof"), [
          this.factory.createIdentLiteral(
            this.ntv.visit(node.metadata.infer_type.element_type).gen()
          ),
        ]),
      ]
    );
  }

  protected visitEndOfFileToken(_node: ts.EndOfFileToken): undefined {
    return undefined;
  }

  protected visitElementAccessExpression(
    node: ts.ElementAccessExpression
  ): c.Expr {
    let arr = this.visit(node.expression);
    if (!arr) throw new InternalError("arr must be a value");
    let accessor = this.visit(node.argumentExpression);
    if (!accessor) throw new InternalError("accessor must be a value");
    if (!node.metadata?.infer_type)
      throw new InternalError("un-inferred type (see previous pass)");
    let call = this.factory.createCallExpr(
      this.factory.createBinaryExpr(
        arr as c.Expr,
        c.TokenKind.MinusGreater,
        this.factory.createIdentLiteral("__internal__get")
      ),
      [arr as c.Expr, accessor as c.Expr]
    );
    return this.factory.createUnaryExpr(
      c.TokenKind.Asterisk,
      this.factory.createCastExpr(
        this.factory.createRefType(this.ntv.visit(node.metadata.infer_type)),
        call
      )
    );
  }
}
