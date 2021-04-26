import ts, { Type, TypeNode } from "typescript";
import { ClassTypeData } from "./infer_pass";
import { Scope } from "./scope";

declare module "typescript" {
  export interface Metadata {
    anonymous_obj_type?: TypeNode;
    infer_type?: TypeNode;
    class_type_scope?: Scope<ClassTypeData>;
    this_passthrough?: ts.Expression;
  }
  export interface Node {
    metadata?: Metadata;
  }
  export interface VariableDeclaration {
    public type?: TypeNode;
  }
}
