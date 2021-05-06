import { InternalError } from "./err";

export enum TypeKind {
  Class,
  String,
  Number,
  Boolean,
  Function,
  Void,
  AnonymousFunction,
  Any,
  Array,
  Generic,
}

// Named member class
export abstract class Type {
  readonly kind: TypeKind;
  constructor(kind: TypeKind) {
    this.kind = kind;
  }

  isCompatibleWith(other: Type) {
    return this.kind == other.kind;
  }

  abstract toString(): string;

  isGeneric(): this is GenericContainer {
    return this.kind === TypeKind.Generic;
  }

  isClass(): this is ClassType {
    return this.kind === TypeKind.Class;
  }

  isClassLike(): this is ClassType {
    return this.isClass() || this.isString() || this.isArray();
  }

  isString(): this is StringType {
    return this.kind === TypeKind.String;
  }

  isNumber(): this is NumberType {
    return this.kind === TypeKind.Number;
  }

  isVoid(): this is VoidType {
    return this.kind === TypeKind.Void;
  }

  isFunction(): this is FunctionType {
    return this.kind === TypeKind.Function;
  }

  isArray(): this is ArrayType {
    return this.kind === TypeKind.Array;
  }

  isAnonymousFunction(): this is AnonymousFunctionType {
    return this.kind === TypeKind.AnonymousFunction;
  }

  isAny(): this is AnyType {
    return this.kind === TypeKind.Any;
  }

  containsGenerics(): boolean {
    if (this.isGeneric()) return true;
    if (this.isArray()) return this.element_type.containsGenerics();
    // TODO: expand this more
    return false;
  }

  resolveGenerics(other: Type) {
    if (!this.containsGenerics()) return;
    if (this.isGeneric()) {
      this.setEvaluatedType(other);
    }
    if (this.isArray() && other.isArray()) {
      if (this.element_type.isGeneric()) {
        this.element_type.setEvaluatedType(other.element_type);
      }
    }
  }
}

export interface ClassMember {
  index: number;
  type: Type;
}

export class GenericContainer extends Type {
  evaluated_type?: Type;

  setEvaluatedType(type: Type) {
    this.evaluated_type = type;
  }

  toString() {
    return this.evaluated_type?.toString() || "<Unevaluated Generic Type>";
  }

  isCompatibleWith(other: Type) {
    if (!this.evaluated_type) throw new InternalError("Unevaluated generic");
    return this.evaluated_type.isCompatibleWith(other);
  }
  constructor() {
    super(TypeKind.Generic);
  }
}

export class ClassType extends Type {
  readonly name: string;
  private readonly members: Map<string, ClassMember>;
  readonly generics: GenericContainer[];

  toString() {
    return this.name;
  }

  get(name: string) {
    return this.members.get(name);
  }

  constructor(
    name: string,
    members: Map<string, ClassMember>,
    kind?: TypeKind,
    generics?: GenericContainer[]
  ) {
    super(kind || TypeKind.Class);
    this.name = name;
    this.members = members;
    this.generics = generics || [];
  }
}

export class AnyType extends Type {
  toString() {
    return "any";
  }

  isCompatibleWith(_: Type) {
    return true;
  }

  constructor() {
    super(TypeKind.Any);
  }
}

export class VoidType extends Type {
  toString() {
    return "void";
  }
  constructor() {
    super(TypeKind.Void);
  }
}

export class NumberType extends Type {
  toString() {
    return "number";
  }
  constructor() {
    super(TypeKind.Number);
  }
}

export class BooleanType extends Type {
  toString() {
    return "boolean";
  }
  constructor() {
    super(TypeKind.Boolean);
  }
}

export class StringType extends ClassType {
  toString() {
    return "string";
  }
  constructor() {
    super("String", new Map(), TypeKind.String);
  }
}

export class ArrayType extends ClassType {
  readonly element_type: Type;
  toString() {
    return `${this.element_type.toString()}[]`;
  }
  constructor(element_type: Type) {
    super("Array", new Map(), TypeKind.Array);
    this.element_type = element_type;
  }
  get(name: string) {
    switch (name) {
      case "at":
        return {
          index: 5,
          type: new FunctionType("at", this.element_type, [
            new NumberType()
          ]),
        };
      case "concat":
        return {
          index: 6,
          type: new FunctionType("concat", this, [
            this
          ]),
        };
      case "push":
        return {
          index: 0,
          type: new FunctionType("push", new VoidType(), [this.element_type]),
        };
      case "length":
        return {
          index: 1,
          type: new NumberType(),
        };
      case "forEach":
        return {
          index: 2,
          type: new FunctionType("forEach", new VoidType(), [
            new FunctionType(undefined, new VoidType(), [this.element_type]),
          ]),
        };
      case "join":
        return {
          index: 4,
          type: new FunctionType("join", new StringType(), [
            new StringType()
          ]),
        };
      case "map": {
        let k = new GenericContainer();
        return {
          index: 3,
          type: new FunctionType(
            "map",
            new ArrayType(k),
            [new FunctionType(undefined, k, [this.element_type])],
            undefined,
            [k]
          ),
        };
      }
    }
    return undefined;
  }

  isCompatibleWith(other: Type) {
    return (
      other.isArray() && other.element_type.isCompatibleWith(this.element_type)
    );
  }
}

export class FunctionType extends Type {
  readonly name?: string;
  readonly return_type: Type;
  readonly parameters: Type[];
  readonly sha?: string;
  readonly generics: GenericContainer[];

  toString() {
    return `(${this.parameters
      .map((p) => p.toString())
      .join(", ")}) => ${this.return_type.toString()}`;
  }

  constructor(
    name: string | undefined,
    return_type: Type,
    parameters: Type[],
    sha?: string,
    generics?: GenericContainer[]
  ) {
    super(TypeKind.Function);
    this.name = name;
    this.return_type = return_type;
    this.parameters = parameters;
    this.sha = sha;
    this.generics = generics || [];
  }
}

export class AnonymousFunctionType extends Type {
  readonly return_type: Type;
  readonly parameters: Type[];
  readonly sha: string;

  toString() {
    return `(${this.parameters
      .map((p) => p.toString())
      .join(", ")}) => ${this.return_type.toString()}`;
  }

  constructor(return_type: Type, parameters: Type[], sha: string) {
    super(TypeKind.AnonymousFunction);
    this.return_type = return_type;
    this.parameters = parameters;
    this.sha = sha;
  }
}
