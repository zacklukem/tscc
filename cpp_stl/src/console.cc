#include <iostream>
#include <stl.h>

Rc<Console> console;

Console::Console() {}

Rc<String> Console::toString() {
  return std::make_shared<String>("[Console object]");
}

void Console::log(Rc<Any> string) {
  std::cout << string->toString()->_data << "\n";
}

void Console::log(NUMBER value) { std::cout << value << "\n"; }