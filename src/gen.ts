import sha1 from "js-sha1";
import { NodeVisitor } from "./visitor";
import ts from "typescript";
import llvm from "llvm-node";
import { InternalError } from "./err";
import { TypeVisitor } from "./type_visitor";
import { Scope } from "./scope";
import { ClassTypeData } from "./infer_pass";
import {
  ALLOC_RC,
  FREE_RC,
  MOVE_RC,
  classDestructorSymbol,
  classConstructorSymbol,
} from "./intrinsics";

class GenTypeVisitor extends TypeVisitor<llvm.Type> {
  private ctx: llvm.LLVMContext;
  private _structs_scope: Scope<llvm.StructType>;

  public get structs_scope(): Scope<llvm.StructType> {
    return this._structs_scope;
  }
  public set structs_scope(value: Scope<llvm.StructType>) {
    this._structs_scope = value;
  }

  constructor(ctx: llvm.LLVMContext) {
    super();
    this.ctx = ctx;
    this._structs_scope = new Scope();
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

  protected visitTypeLiteralNode(node: ts.TypeLiteralNode): llvm.Type {
    let s = llvm.StructType.create(this.ctx, "anon");
    let body = node.members.map((member) => {
      let m = member as ts.PropertySignature;
      if (!m.type) throw new InternalError("missing property type");
      return this.visit(m.type);
    });
    s.setBody(body);
    return llvm.PointerType.get(s, 0);
  }

  protected visitTypeReferenceNode(node: ts.TypeReferenceNode): llvm.Type {
    let name = node.typeName;
    let ty = this.structs_scope.get(name.getText());
    if (!ty)
      throw new InternalError("Type name not found, check previous pass");
    return llvm.PointerType.get(ty, 0);
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
  private structs_scope: Scope<llvm.StructType>;
  private class_type_scope: Scope<ClassTypeData>;

  constructor() {
    super();
    this.ctx = new llvm.LLVMContext();
    this.mod = new llvm.Module("debug", this.ctx);
    this.tv = new GenTypeVisitor(this.ctx);
    this.builder = new llvm.IRBuilder(this.ctx);
    this.pointer_mode = false;
    this.current_scope = new Scope();
    this.structs_scope = new Scope();
    this.class_type_scope = new Scope();
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

  private genFunc(name: string, ret_type: llvm.Type, ...args: llvm.Type[]) {
    let func_type = llvm.FunctionType.get(ret_type, args, false);
    return llvm.Function.create(
      func_type,
      llvm.LinkageTypes.ExternalLinkage,
      name,
      this.mod
    );
  }

  private genLibC() {
    // TODO: decide how to do this better

    let func = this.genFunc(
      "printDouble",
      llvm.Type.getVoidTy(this.ctx),
      llvm.Type.getDoubleTy(this.ctx)
    );
    this.current_scope.add("printDouble", func);

    this.genFunc(
      ALLOC_RC,
      llvm.Type.getInt8PtrTy(this.ctx),
      llvm.Type.getInt64Ty(this.ctx)
    );
    this.genFunc(
      MOVE_RC,
      llvm.Type.getVoidTy(this.ctx),
      llvm.Type.getInt8PtrTy(this.ctx)
    );
    this.genFunc(
      FREE_RC,
      llvm.Type.getVoidTy(this.ctx),
      llvm.Type.getInt8PtrTy(this.ctx)
    );
  }

  // @ts-ignore
  private genCall(func_name: string, ...args: llvm.Value[]) {
    let func = this.mod.getFunction(func_name);
    if (!func) throw new InternalError("internal function issue");
    if (!func?.type?.elementType)
      throw new InternalError("internal function issue");
    return this.builder.createCall(func?.type?.elementType, func, args);
  }

  private genAssign(expr: llvm.Value, alloca: llvm.Value) {
    if (alloca.type.isPointerTy()) {
      let alloca_pt = alloca.type as llvm.PointerType;
      if (alloca_pt.elementType.isPointerTy() && expr.type.isPointerTy()) {
        let bc = this.builder.createBitCast(expr, alloca_pt.elementType);
        return this.builder.createStore(bc, alloca);
      }
    }
    return this.builder.createStore(expr, alloca);
  }

  protected visitSourceFile(node: ts.SourceFile): undefined {
    this.current_file = node;
    this.mod = new llvm.Module(node.fileName, this.ctx);
    this.mod.sourceFileName = node.fileName;
    this.current_scope = new Scope();
    this.structs_scope = new Scope();
    this.tv.structs_scope = this.structs_scope;
    if (!node.metadata?.class_type_scope)
      throw new InternalError("Missing class type scope (see previous pass)");
    this.class_type_scope = node.metadata.class_type_scope;
    this.genLibC();
    node.forEachChild(this.visit);
    return undefined;
  }

  protected visitFunctionDeclaration(node: ts.FunctionDeclaration): undefined {
    // if (!node.type)
    //   throw new InternalError(
    //     "Expected function return type inferred from previous pass"
    //   );

    if (!node.body) {
      // TODO: add declarations or something
      return undefined;
      // throw new InternalError("No-body functions not yet implemented");
    }

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

    // llvm.verifyFunction(func);

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
    if (!node.metadata?.infer_type) {
      throw new InternalError(
        "Variable declaration is missing type (should be checked in previous pass)"
      );
    }

    let alloca = this.insertAlloca(
      this.tv.visit(node.metadata.infer_type),
      node.name.getText()
    );

    if (node.initializer) {
      let expr = this.visit(node.initializer);
      if (!expr)
        throw new InternalError(
          "Initializer has no value (should be checked in previous pass)"
        );
      this.genAssign(expr, alloca);
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
      this.genAssign(rhs, lhs);
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

  protected visitObjectLiteralExpression(
    _node: ts.ObjectLiteralExpression
  ): llvm.Value {
    throw new InternalError("Unimplemented");
    // let values: [ts.PropertyName, llvm.Value][] = node.properties.map(
    //   (prop) => {
    //     let asn = prop as ts.PropertyAssignment;
    //     let val = this.visit(asn.initializer);
    //     if (!val) throw new InternalError("Expected value");
    //     return [asn.name, val];
    //   }
    // );
    // let size = values
    //   .map((val) => val[1].type.getPrimitiveSizeInBits())
    //   .reduce((a, b) => a + b, 0);

    // return this.genCall(size);
  }

  protected visitClassDeclaration(node: ts.ClassDeclaration): undefined {
    if (!node.name)
      throw new InternalError("Class is missing name (see previous pass)");

    let s = llvm.StructType.create(this.ctx, "class_" + node.name.getText());
    let body = node.members.map((member) => {
      if (member.kind === ts.SyntaxKind.PropertyDeclaration) {
        let m = member as ts.PropertyDeclaration;
        if (!m.type) throw new InternalError("missing property type");
        return this.tv.visit(m.type);
      }
      throw new InternalError(
        "other than class props all else not yet implemented"
      );
    });
    s.setBody(body);
    this.structs_scope.add(node.name.getText(), s);
    let old_bb = this.builder.getInsertBlock();
    let ptr_type = llvm.PointerType.get(s, 0);

    // TODO: constructor args passthrough
    {
      // Constructor
      let func = this.genFunc(
        classConstructorSymbol(node.name.getText()),
        ptr_type
      );
      let bb = llvm.BasicBlock.create(this.ctx, "constructor", func);
      this.builder.setInsertionPoint(bb);

      let size =
        body
          .map((val) => val.getPrimitiveSizeInBits())
          .reduce((a, b) => a + b, 0) / 8;

      let ptr = this.genCall(
        ALLOC_RC,
        llvm.ConstantInt.get(this.ctx, size, 64, false)
      );
      let bitcast = this.builder.createBitCast(ptr, ptr_type);
      this.builder.createRet(bitcast);
    }
    {
      // Destructor
      let func = this.genFunc(
        classDestructorSymbol(node.name.getText()),
        llvm.Type.getVoidTy(this.ctx),
        ptr_type
      );
      let bb = llvm.BasicBlock.create(this.ctx, "start", func);
      this.builder.setInsertionPoint(bb);

      // TODO: free members

      let bitcast = this.builder.createBitCast(
        func.getArguments()[0],
        llvm.Type.getInt8PtrTy(this.ctx)
      );
      this.genCall(FREE_RC, bitcast);
      this.builder.createRetVoid();
    }

    if (old_bb) this.builder.setInsertionPoint(old_bb);
    return undefined;
  }

  protected visitNewExpression(node: ts.NewExpression): llvm.Value {
    return this.genCall(
      classConstructorSymbol((node.expression as ts.Identifier).getText())
    );
  }

  protected visitPropertyAccessExpression(
    node: ts.PropertyAccessExpression
  ): llvm.Value {
    let old_ptr_mode = this.pointer_mode;
    this.pointer_mode = false;
    let lhs = this.visit(node.expression); // lhs
    this.pointer_mode = old_ptr_mode;
    let rhs = node.name.getText();
    if (!lhs?.type.isPointerTy())
      throw new InternalError("lhs is not class or object");
    let lhs_int = (lhs.type as llvm.PointerType).elementType;

    if (!lhs_int?.isStructTy())
      throw new InternalError("lhs is not class or object");
    let lhs_str = lhs_int as llvm.StructType;
    let str_name = lhs_str.name?.substring(6);

    if (!str_name) throw new InternalError("Struct has no name");

    let class_type = this.class_type_scope.get(str_name);
    if (!class_type) throw new InternalError("Class type not found");
    let member_index = class_type.members.get(rhs);
    if (member_index === undefined)
      // Number | undefined issue
      throw new InternalError("Member not found (see previous pass)");

    let gep = this.builder.createInBoundsGEP(
      lhs_str,
      lhs,
      [
        llvm.ConstantInt.get(this.ctx, member_index, 64, false)
      ],
      "struct_gep"
    );
    if (this.pointer_mode) return gep;
    return this.builder.createLoad(gep, rhs + "_pae");
  }

  public print() {
    llvm.writeBitcodeToFile(this.mod, "example.bc");
    console.log(this.mod.print());
  }
}
