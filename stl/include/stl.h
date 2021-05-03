#pragma once
#include <stdlib.h>
#include "macro.h"

void printDouble(NUMBER val);

// TODO: maybe make this more efficient

void* c_intrinsic_alloc_rc(size_t size);

void c_intrinsic_move_rc(void* ptr);

void c_intrinsic_free_rc(void* ptr);

//== String class ==//
DECLARE_CLASS(String);
// String String::toString();
DECLARE_CLASS_METHOD(CLASS(String), String, toString);
// String String::concat(String other);
DECLARE_CLASS_METHOD(CLASS(String), String, concat, CLASS(String) other);
// String String::constructor(char* literal);
DECLARE_CLASS_CONSTRUCTOR(String, char* literal);

struct String {
	/*private*/ uint64_t _type_id;
	SDECLARE_CLASS_METHOD(String, toString);
	/*private*/ char* _data;
	SDECLARE_CLASS_METHOD(String, concat);
};

//== Number class ==//
DECLARE_CLASS(Number);
// String Number::toString();
DECLARE_CLASS_METHOD(CLASS(String), Number, toString);
// Number Number::constructor(number literal);
DECLARE_CLASS_CONSTRUCTOR(Number, NUMBER literal);

struct Number {
	/*private*/ uint64_t _type_id;
	SDECLARE_CLASS_METHOD(Number, toString);
	/*private*/ NUMBER data;
};

//== Any class ==//
DECLARE_CLASS(Any);

DEFINE_CLASS_METHOD(CLASS(String), Any, toString);

struct Any {
	/*private*/ uint64_t _type_id;
	SDECLARE_CLASS_METHOD(Any, toString);
};

//== Console class ==//
DECLARE_CLASS(Console);
// String Console::toString();
DECLARE_CLASS_METHOD(CLASS(String), Console, toString);
// void Console::log(String input);
DECLARE_CLASS_METHOD(void, Console, log, CLASS(Any) input);
// Console Console::constructor();
DECLARE_CLASS_CONSTRUCTOR(Console);

struct Console {
	/*private*/ uint64_t _type_id;
	SDECLARE_CLASS_METHOD(Console, toString);
	SDECLARE_CLASS_METHOD(Console, log);
};

extern CLASS(Console) console;

//== Array class ==//
DECLARE_CLASS(Array);
// String Array::toString();
DECLARE_CLASS_METHOD(CLASS(String), Array, toString);
// void Array::push(void* input);
DECLARE_CLASS_METHOD(void, Array, push, uint64_t value);
// void Array::__internal__get(void* input);
DECLARE_CLASS_METHOD(void*, Array, __internal__get, NUMBER index);
// Array Array::constructor();
DECLARE_CLASS_CONSTRUCTOR(Array);

struct Array {
	/*private*/ uint64_t _type_id;
	SDECLARE_CLASS_METHOD(Array, toString);
	/*private*/ uint64_t* _data;
	/*private*/ size_t _allocated;
	/*private*/ size_t _length;
	NUMBER length;
	SDECLARE_CLASS_METHOD(Array, push);
	SDECLARE_CLASS_METHOD(Array, __internal__get);
};

//== Util functions ==//

static inline uint64_t __internal__f64_to_u64(double d) {
	union { double d; uint64_t u; } val;
	val.d = d;
	return val.u;
}
