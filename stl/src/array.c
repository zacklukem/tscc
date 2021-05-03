#include <stl.h>
#include <stdio.h>
#include <string.h>
#include <stdint.h>
#include <stdarg.h>


// String Array::toString();
CLASS(String) CLASS_METHOD(Array, toString) {
  return CLASS_CONSTRUCTOR_NAME(String)("[Array object]");
}

// void Array::push(void* input);
void CLASS_METHOD(Array, push, uint64_t value) {
	// NOTE: x86_64 only

	if (this->_length >= this->_allocated) {
		this->_allocated += 10; // increment by 10 each time
		this->_data = realloc(this->_data, sizeof(CLASS(Any)) * this->_allocated);
	}

	this->_data[this->_length] = value;
	this->_length++;
	this->length++;
}

// void Array::__internal__get(void* input);
void* CLASS_METHOD(Array, __internal__get, NUMBER index) {
	size_t index_i = (size_t) index;
	if (index >= this->_length) {
		printf("index out of bounds"); // or return undefined
	}
	return (void*) &this->_data[index_i];
}

// Array Array::constructor();
CLASS_CONSTRUCTOR_IMPL(Array) {
	this->_allocated = 10;
	this->_length = 0;
	this->length = 0.0;
	this->_data = malloc(sizeof(uint64_t) * this->_allocated);
} INIT_METHOD(Array, toString)
  INIT_METHOD(Array, push)
  INIT_METHOD(Array, __internal__get)
  CLASS_CONSTRUCTOR_END(Array);
