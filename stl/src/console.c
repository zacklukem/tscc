#include <stl.h>
#include <stdio.h>

CLASS(String) CLASS_METHOD(Console, toString) {
  return CLASS_CONSTRUCTOR_NAME(String)("[Console object]");
}

void CLASS_METHOD(Console, log, CLASS(Any) input) {
	puts(input->toString(input)->_data);
}

CLASS_CONSTRUCTOR_IMPL(Console) {
} INIT_METHOD(Console, toString)
  INIT_METHOD(Console, log)
  CLASS_CONSTRUCTOR_END(Console);

CLASS(Console) console;