#include <stl.h>
#include <stdio.h>
#include <stdlib.h>

CLASS(String) CLASS_METHOD(Number, toString) {
	char* buffer = malloc(20);
	sprintf(buffer, "%f", this->data);
  return CLASS_CONSTRUCTOR_NAME(String)(buffer);
}

CLASS_CONSTRUCTOR_IMPL(Number, NUMBER literal) {
	this->data = literal;
} INIT_METHOD(Number, toString)
  CLASS_CONSTRUCTOR_END(Number);
