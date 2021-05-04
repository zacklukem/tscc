#include <stl.h>
#include <string>

Rc<String> String::toString() {
  return std::make_shared<String>(this->_data.c_str());
}

String::String(const char* initializer) : _data(initializer) {}
