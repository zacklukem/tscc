#pragma once
#include <stdlib.h>

void printDouble(double val);

// TODO: maybe make this more efficient

void* c_intrinsic_alloc_rc(size_t size);

void c_intrinsic_move_rc(void* ptr);

void c_intrinsic_free_rc(void* ptr);
