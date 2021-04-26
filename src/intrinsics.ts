export const ALLOC_RC = "c_intrinsic_alloc_rc";
export const MOVE_RC = "c_intrinsic_move_rc";
export const FREE_RC = "c_intrinsic_free_rc";

export function classConstructorSymbol(str: string) {
  return str + "_constructor_internal";
}

export function classDestructorSymbol(str: string) {
  return str + "_destructor_internal";
}
