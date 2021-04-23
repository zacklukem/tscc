import sha1 from "js-sha1";
import { NodeVisitor } from "./visitor";
import ts from "typescript";
import llvm from "llvm-node";
import { InternalError } from "./err";
import { TypeVisitor } from "./type_visitor";

class Scope<T> {
  private values: Map<string, T>;
  public readonly parent?: Scope<T>;

  constructor(parent?: Scope<T>) {
    this.values = new Map();
    this.parent = parent;
  }

  public add(name: string, value: T) {
    this.values.set(name, value);
  }

  public has(name: string) {
    return this.values.has(name);
  }

  public get(name: string): T | undefined {
    if (this.values.has(name)) return this.values.get(name);
    if (!this.parent) return undefined;
    return this.parent.get(name);
  }
}

class GenTypeVisitor extends TypeVisitor<llvm.Type> {
  ctx: llvm.LLVMContext;
  constructor(ctx: llvm.LLVMContext) {
    super();
    this.ctx = ctx;
  }
  protected visitNumberKeyword(
    _: ts.KeywordToken<ts.SyntaxKind.NumberKeyword>
  ): llvm.Type {
    return llvm.Type.getDoubleTy(this.ctx);
  }

  protected visitFunctionTypeNode(node: ts.FunctionTypeNode): llvm.Type {
    let args = node.parameters.map((arg) =>
      arg.type ? this.visit(arg.type) : llvm.Type.getVoidTy(this.ctx)
    );
    return llvm.PointerType.get(
      llvm.FunctionType.get(
        this.visit(node.type),
        args, // TODO: better arguments
        false
      ),
      0
    );
  }

  protected visitVoidKeyword(
    _: ts.KeywordToken<ts.SyntaxKind.VoidKeyword>
  ): llvm.Type {
    return llvm.Type.getVoidTy(this.ctx);
  }
}

export class GenVisitor extends NodeVisitor<llvm.Value | undefined> {
  private ctx: llvm.LLVMContext;
  private mod: llvm.Module;
  private builder: llvm.IRBuilder;
  private tv: GenTypeVisitor;
  private pointer_mode: boolean;
  /// @ts-ignore
  private current_file?: ts.SourceFile;
  private current_scope: Scope<llvm.Value>;

  constructor() {
    super();
    this.ctx = new llvm.LLVMContext();
    this.mod = new llvm.Module("debug", this.ctx);
    this.tv = new GenTypeVisitor(this.ctx);
    this.builder = new llvm.IRBuilder(this.ctx);
    this.pointer_mode = false;
    this.current_scope = new Scope();
  }

  private enterScope() {
    this.current_scope = new Scope(this.current_scope);
  }

  private exitScope() {
    this.current_scope = this.current_scope.parent || new Scope();
  }

  private visitPtr(node: ts.Node): llvm.Value | undefined {
    this.pointer_mode = true;
    let v = this.visit(node);
    this.pointer_mode = false;
    return v;
  }

  private insertAlloca(type: llvm.Type, name: string | undefined) {
    let func = this.builder.getInsertBlock()?.parent;

    if (!func)
      throw new InternalError("Must be in a function to insert alloca");

    let entry_block = func.getEntryBlock();

    if (entry_block == null) throw new InternalError("Missing entry block");

    let builder = new llvm.IRBuilder(entry_block);

    return builder.createAlloca(type, undefined, name);
  }

  private genLibC() {
    let func_type = llvm.FunctionType.get(
      llvm.Type.getVoidTy(this.ctx),
      [llvm.Type.getDoubleTy(this.ctx)],
      false
    );
    let func = llvm.Function.create(
      func_type,
      llvm.LinkageTypes.ExternalLinkage,
      "printDouble",
      this.mod
    );
    this.current_scope.add("printDouble", func);
  }

  protected visitSourceFile(node: ts.SourceFile): undefined {
    this.current_file = node;
    this.mod = new llvm.Module(node.fileName, this.ctx);
    this.mod.sourceFileName = node.fileName;
    this.current_scope = new Scope();
    this.genLibC();
    node.forEachChild(this.visit);
    return undefined;
  }

  protected visitFunctionDeclaration(node: ts.FunctionDeclaration): undefined {
    // if (!node.type)
    //   throw new InternalError(
    //     "Expected function return type inferred from previous pass"
    //   );

    if (!node.body)
      throw new InternalError("No-body functions not yet implemented");

    this.enterScope();

    let return_type = node.type
      ? this.tv.visit(node.type)
      : llvm.Type.getVoidTy(this.ctx);

    // Convert ts argument types to llvm types
    let arg_types = node.parameters.map((param) => {
      if (!param.type) throw new InternalError("Unimplemented");
      return this.tv.visit(param.type);
    });

    let function_type = llvm.FunctionType.get(return_type, arg_types, false);

    let func = llvm.Function.create(
      function_type,
      llvm.LinkageTypes.ExternalLinkage,
      node.name ? node.name.getText() : undefined,
      this.mod
    );

    this.current_scope.parent?.add(node.name?.getText() || "", func);

    let init_bb = llvm.BasicBlock.create(this.ctx, "init", func);

    let bb = llvm.BasicBlock.create(this.ctx, "start", func);
    this.builder.setInsertionPoint(bb);

    // Move parameters to the stack
    for (let [i, arg] of func.getArguments().entries()) {
      let alloca = this.insertAlloca(
        arg.type,
        node.parameters[i].name.getText()
      );
      this.builder.createStore(arg, alloca);
      this.current_scope.add(node.parameters[i].name.getText(), alloca);
    }

    // Build body
    this.visit(node.body);

    if (!this.builder.getInsertBlock()?.getTerminator()) {
      this.builder.createRetVoid();
    }

    this.builder.setInsertionPoint(init_bb);
    this.builder.createBr(bb);

    llvm.verifyFunction(func);

    this.exitScope();
    return undefined;
  }

  protected visitBlock(node: ts.Block): undefined {
    this.enterScope();
    node.forEachChild(this.visit);
    this.exitScope();
    return undefined;
  }

  protected visitReturnStatement(node: ts.ReturnStatement): undefined {
    if (node.expression) {
      let expr = this.visit(node.expression);
      if (!expr)
        throw new InternalError(
          "Return expression has no value (early pass should prevent this)"
        );
      this.builder.createRet(expr);
    } else {
      this.builder.createRetVoid();
    }
    return undefined;
  }

  protected visitNumericLiteral(node: ts.NumericLiteral): llvm.Value {
    let value = eval(node.getText());
    if (typeof value != "number")
      throw new InternalError("Unable to parse number");
    let n_val = value as number;
    return llvm.ConstantFP.get(this.ctx, n_val);
  }

  protected visitIdentifier(node: ts.Identifier): llvm.Value {
    let str_val = node.getText();
    let v = this.mod.getFunction(str_val);
    if (v) return v;
    let value = this.current_scope.get(str_val);
    if (value) {
      if (this.pointer_mode) return value;
      return this.builder.createLoad(value, str_val + "_load");
    }
    throw new InternalError(
      "Missing variable (should be checked in previous pass)"
    );
  }

  protected visitVariableStatement(node: ts.VariableStatement): undefined {
    this.visit(node.declarationList);
    return undefined;
  }

  protected visitVariableDeclaration(node: ts.VariableDeclaration): undefined {
    if (!node.type)
      throw new InternalError(
        "Variable declaration is missing type (should be checked in previous pass)"
      );

    let alloca = this.insertAlloca(
      this.tv.visit(node.type),
      node.name.getText()
    );

    if (node.initializer) {
      let expr = this.visit(node.initializer);
      if (!expr)
        throw new InternalError(
          "Initializer has no value (should be checked in previous pass)"
        );
      this.builder.createStore(expr, alloca);
    }

    this.current_scope.add(node.name.getText(), alloca);

    return undefined;
  }

  protected visitVariableDeclarationList(
    node: ts.VariableDeclarationList
  ): undefined {
    node.forEachChild(this.visit);
    return undefined;
  }

  protected visitIfStatement(node: ts.IfStatement): undefined {
    let condition = this.visit(node.expression);

    if (!condition)
      throw new InternalError(
        "If statement condition has no value (should be checked in previous pass)"
      );

    let then = llvm.BasicBlock.create(
      this.ctx,
      "then",
      this.builder.getInsertBlock()?.parent
    );
    let else_b = llvm.BasicBlock.create(this.ctx, "else", then.parent);
    let continue_b = llvm.BasicBlock.create(this.ctx, "continue");

    this.builder.createCondBr(condition, then, else_b);
    this.builder.setInsertionPoint(then);

    this.visit(node.thenStatement);

    if (!then.getTerminator()) {
      this.builder.createBr(continue_b);
    }

    this.builder.setInsertionPoint(else_b);

    if (node.elseStatement) {
      this.visit(node.elseStatement);
    }

    if (!else_b.getTerminator()) {
      this.builder.createBr(continue_b);
    }

    this.builder.getInsertBlock()?.parent?.addBasicBlock(continue_b);
    if (!this.builder.getInsertBlock()?.getTerminator()) {
      this.builder.createBr(continue_b);
    }
		this.builder.setInsertionPoint(continue_b);

    return undefined;
  }

  protected visitWhileStatement(node: ts.WhileStatement): undefined {
    let loop = llvm.BasicBlock.create(
      this.ctx,
      "loop",
      this.builder.getInsertBlock()?.parent
    );
    let continue_b = llvm.BasicBlock.create(this.ctx, "continue");
    let body = llvm.BasicBlock.create(this.ctx, "body", loop.parent);

    this.builder.createBr(loop);
    this.builder.setInsertionPoint(loop);

    let condition = this.visit(node.expression);

    if (!condition)
      throw new InternalError(
        "While statement condition has no value (should be checked in previous pass)"
      );
    this.builder.createCondBr(condition, body, continue_b);

    this.builder.setInsertionPoint(body);

    this.visit(node.statement);

    if (!this.builder.getInsertBlock()?.getTerminator()) {
      this.builder.createBr(loop);
    }

    this.builder.getInsertBlock()?.parent?.addBasicBlock(continue_b);
    this.builder.setInsertionPoint(continue_b);
    return undefined;
  }

  protected visitForStatement(node: ts.ForStatement): undefined {
    let loop = llvm.BasicBlock.create(
      this.ctx,
      "loop",
      this.builder.getInsertBlock()?.parent
    );
    let continue_b = llvm.BasicBlock.create(this.ctx, "continue");
    let body = llvm.BasicBlock.create(this.ctx, "body", loop.parent);

    if (node.initializer) {
      this.visit(node.initializer);
    }

    this.builder.createBr(loop);
    this.builder.setInsertionPoint(loop);

    if (!node.condition)
      throw new InternalError("no-condition not implemented");

    let condition = this.visit(node.condition);

    if (!condition)
      throw new InternalError(
        "While statement condition has no value (should be checked in previous pass)"
      );

    this.builder.createCondBr(condition, body, continue_b);

    this.builder.setInsertionPoint(body);

    this.visit(node.statement);

    if (node.incrementor) {
      this.visit(node.incrementor);
    }

    if (!this.builder.getInsertBlock()?.getTerminator()) {
      this.builder.createBr(loop);
    }

    this.builder.getInsertBlock()?.parent?.addBasicBlock(continue_b);
    this.builder.setInsertionPoint(continue_b);
    return undefined;
  }

  protected visitExpressionStatement(node: ts.ExpressionStatement): undefined {
    this.visit(node.expression);
    return undefined;
  }

  protected visitBinaryExpression(
    node: ts.BinaryExpression
  ): llvm.Value | undefined {
    if (node.operatorToken.kind == ts.SyntaxKind.EqualsToken) {
      let lhs = this.visitPtr(node.left);
      let rhs = this.visit(node.right);
      if (!lhs) throw new InternalError("Lhs is not a value");
      if (!rhs) throw new InternalError("Rhs is not a value");
      this.builder.createStore(rhs, lhs);
      return this.visit(node.left);
    }
    let lhs = this.visit(node.left);
    let rhs = this.visit(node.right);
    if (!lhs) throw new InternalError("Lhs is not a value");
    if (!rhs) throw new InternalError("Rhs is not a value");

    switch (node.operatorToken.kind) {
      case ts.SyntaxKind.LessThanToken:
        return this.builder.createFCmpULT(lhs, rhs); // TODO: polymorphic lt
      case ts.SyntaxKind.GreaterThanToken:
        return this.builder.createFCmpUGT(lhs, rhs); // TODO: polymorphic lt
      case ts.SyntaxKind.LessThanEqualsToken:
        return this.builder.createFCmpULE(lhs, rhs); // TODO: polymorphic lt
      case ts.SyntaxKind.GreaterThanEqualsToken:
        return this.builder.createFCmpUGE(lhs, rhs); // TODO: polymorphic lt
      case ts.SyntaxKind.EqualsEqualsToken:
        return this.builder.createFCmpUEQ(lhs, rhs); // TODO: polymorphic lt
      case ts.SyntaxKind.ExclamationEqualsToken:
        return this.builder.createFCmpUNE(lhs, rhs); // TODO: polymorphic lt
      case ts.SyntaxKind.PlusToken:
        return this.builder.createFAdd(lhs, rhs);
      case ts.SyntaxKind.MinusToken:
        return this.builder.createFSub(lhs, rhs);
      case ts.SyntaxKind.AsteriskToken:
        return this.builder.createFMul(lhs, rhs);
      case ts.SyntaxKind.SlashToken:
        return this.builder.createFDiv(lhs, rhs);
    }
    return undefined;
  }

  protected visitPostfixUnaryExpression(
    node: ts.PostfixUnaryExpression
  ): llvm.Value | undefined {
    let lhs = this.visit(node.operand);
    let lhs_ptr = this.visitPtr(node.operand);
    if (!lhs) throw new InternalError("Lhs is not a value");
    if (!lhs_ptr) throw new InternalError("Lhs ptr is not a value");

    let mod: llvm.Value;

    switch (node.operator) {
      case ts.SyntaxKind.PlusPlusToken:
        mod = this.builder.createFAdd(lhs, llvm.ConstantFP.get(this.ctx, 1));
        break;
      case ts.SyntaxKind.MinusMinusToken:
        mod = this.builder.createFSub(lhs, llvm.ConstantFP.get(this.ctx, 1));
        break;
    }

    this.builder.createStore(mod, lhs_ptr);
    return this.visit(node.operand);
  }

  protected visitCallExpression(
    node: ts.CallExpression
  ): llvm.Value | undefined {
    let lhs = this.visit(node.expression);
    if (!lhs)
      throw new InternalError("Callee has no value (see previous pass)");

    let args = node.arguments.map((arg) => {
      let v = this.visit(arg);
      if (!v) throw new InternalError("Argument has no value");
      return v;
    });

    if (!lhs.type.isPointerTy())
      throw new InternalError("Expected function pointer (see previous pass)");

    let fp_type = lhs.type as llvm.PointerType;

    if (!fp_type.elementType.isFunctionTy())
      throw new InternalError(
        "Expected pointer to function (see previous pass)"
      );

    let function_type = fp_type.elementType as llvm.FunctionType;

    return this.builder.createCall(function_type, lhs, args);
  }

  protected visitArrowFunction(node: ts.ArrowFunction): llvm.Value {
    // if (!node.type)
    //   throw new InternalError(
    //     "Expected function return type inferred from previous pass"
    //   );

    let source_block = this.builder.getInsertBlock();

    if (!source_block) throw new InternalError("Missing insert block");

    let parent_name = this.builder.getInsertBlock()?.parent?.name;

    let name = `_lambda_${parent_name}_${sha1(
      node.getText() + node.getStart()
    ).substr(0, 8)}`;

    if (!node.body)
      throw new InternalError("No-body functions not yet implemented");

    this.enterScope();

    let return_type = node.type
      ? this.tv.visit(node.type)
      : llvm.Type.getVoidTy(this.ctx);

    // Convert ts argument types to llvm types
    let arg_types = node.parameters.map((param) => {
      if (!param.type) throw new InternalError("Unimplemented");
      return this.tv.visit(param.type);
    });

    let function_type = llvm.FunctionType.get(return_type, arg_types, false);

    let func = llvm.Function.create(
      function_type,
      llvm.LinkageTypes.InternalLinkage,
      name,
      this.mod
    );

    // this.current_scope.parent?.add(name || "", func);

    let init_bb = llvm.BasicBlock.create(this.ctx, "init", func);

    let bb = llvm.BasicBlock.create(this.ctx, "start", func);
    this.builder.setInsertionPoint(bb);

    // Move parameters to the stack
    for (let [i, arg] of func.getArguments().entries()) {
      let alloca = this.insertAlloca(
        arg.type,
        node.parameters[i].name.getText()
      );
      this.builder.createStore(arg, alloca);
      this.current_scope.add(node.parameters[i].name.getText(), alloca);
    }

    // Build body
    this.visit(node.body);

    if (!this.builder.getInsertBlock()?.getTerminator()) {
      this.builder.createRetVoid();
    }

    this.builder.setInsertionPoint(init_bb);
    this.builder.createBr(bb);

    llvm.verifyFunction(func);

    this.exitScope();

    this.builder.setInsertionPoint(source_block);
    return func;
  }

  protected visitEndOfFileToken(_node: ts.EndOfFileToken): undefined {
    return undefined;
  }

  public print() {
    llvm.writeBitcodeToFile(this.mod, "example.bc");
    console.log(this.mod.print());
  }
}
