#include <stl.h>
#include <string.h>
#include <stdlib.h>

CLASS(String) CLASS_METHOD(String, toString) {
  return this;
}

CLASS(String) CLASS_METHOD(String, concat, CLASS(String) a) {
  return a;
}

CLASS_CONSTRUCTOR_IMPL(String, char* literal) {
  this->_data = literal;
} INIT_METHOD(String, toString)
  INIT_METHOD(String, concat)
  CLASS_CONSTRUCTOR_END(String);
