export enum TypeKind {
  Class,
  String,
  Number,
  Function,
  Void,
  AnonymousFunction,
  Any,
  Array
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
}

export interface ClassMember {
  index: number;
  type: Type;
}

export class ClassType extends Type {
  readonly name: string;
  readonly members: Map<string, ClassMember>;

  toString() {
    return this.name;
  }

  constructor(
    name: string,
    members: Map<string, ClassMember>,
    kind?: TypeKind
  ) {
    super(kind || TypeKind.Class);
    this.name = name;
    this.members = members;
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
    this.members.set("push", {
      index: 0,
      type: new FunctionType("push", new VoidType(), [new VoidType()]),
    });
    this.members.set("length", {
      index: 1,
      type: new NumberType()
    });
  }
}

export class FunctionType extends Type {
  readonly name?: string;
  readonly return_type: Type;
  readonly parameters: Type[];
  readonly sha?: string;

  toString() {
    return `(${this.parameters
      .map((p) => p.toString())
      .join(", ")}) => ${this.return_type.toString()}`;
  }

  constructor(
    name: string | undefined,
    return_type: Type,
    parameters: Type[],
    sha?: string
  ) {
    super(TypeKind.Function);
    this.name = name;
    this.return_type = return_type;
    this.parameters = parameters;
    this.sha = sha;
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
