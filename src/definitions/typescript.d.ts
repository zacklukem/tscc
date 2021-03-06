import ts, { Type, TypeNode } from "typescript";
import * as ty from "../types";
import { Scope } from "../scope";

declare module "typescript" {
  export interface Metadata {
    anonymous_obj_type?: ty.ClassTypeData;
    cast_to?: string;
    infer_type?: ty.Type;
    class_type_scope?: Scope<ty.ClassTypeData>;
    this_passthrough?: ts.Expression;
    bitcast?: boolean;
    func_type?: ty.FunctionType;
    returns?: [ty.Type, ts.Node];
  }
  export interface Node {
    metadata?: Metadata;
  }
  export interface VariableDeclaration {
    public type?: TypeNode;
  }
}
