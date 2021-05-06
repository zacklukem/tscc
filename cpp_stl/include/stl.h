#ifndef __CPP_STL__CPP_STL_INCLUDE_STL_H
#define __CPP_STL__CPP_STL_INCLUDE_STL_H

#define NUMBER double
#include <functional>
#include <iostream>
#include <memory>
#include <sstream>
#include <string>
#include <vector>

#define Rc std::shared_ptr

class Any;
class String;
class Console;
template <class> class Array;

class Any {
public:
  virtual Rc<String> toString() = 0;
};

class String : public Any {
public:
  virtual Rc<String> toString() {
    return std::make_shared<String>(this->_data);
  };
  String(const char* initializer) : _data(initializer){};
  String(std::string initializer) : _data(initializer){};

public:
  std::string _data;
};

Rc<String> operator+(Rc<String> lhs, Rc<String> rhs) {
  return std::make_shared<String>(lhs->_data + rhs->_data);
}

template <class T> class Array : public Any {
public:
  NUMBER length;

  virtual Rc<String> toString() override {
    return std::make_shared<String>("[Array object]");
  };

  T operator[](NUMBER i) const { return this->_data[(std::size_t)i]; };

  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/at
  T at(NUMBER i) const {
    std::size_t n;
    if (i < 0)
      n = static_cast<std::size_t>(this->length + i);
    else
      n = static_cast<std::size_t>(i);
    return this->_data[i];
  }

  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/concat
  // TODO: add varargs
  Rc<Array<T>> concat(Rc<Array<T>> other) {
    this->_data.insert(other->_data.end(), other->_data.begin(),
                       other->_data.end());
  }

  virtual void forEach(std::function<void(T)> callback) {
    for (auto& el : this->_data)
      callback(el);
  }

  template <class K> Rc<Array<K>> map(std::function<K(T)> callback) {
    // TODO: maybe use std::transform or something
    std::vector<K> vec(this->_data.size());
    for (int i = 0; i < this->_data.size(); i++) {
      vec[i] = callback(this->_data[i]);
    }
    return std::make_shared<Array<K>>(vec);
  }

  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/join
  // TODO: implement optional separator
  Rc<String> join(Rc<String> separator) {
    std::stringstream buf;
    for (int i = 0; i < this->_data.size(); i++) {
      buf << this->_data[i]->toString()->_data;
      if (i != this->_data.size() - 1)
        buf << separator->_data;
    }
    return std::make_shared<String>(buf.str());
  }

  virtual void push(T value) {
    this->_data.push_back(value);
    this->length++;
  };

  Array<T>() : _data(), length(0){};

  Array<T>(std::vector<T> vec) : _data(vec), length(0){};

  Array<T>(std::initializer_list<T> list)
      : _data(list), length((NUMBER)list.size()){};

private:
  std::vector<T> _data;
};

class Console : public Any {
public:
  virtual Rc<String> toString();
  virtual void log(Rc<Any> value);
  virtual void log(NUMBER value);
  Console();
};

static Rc<Console> console;

Console::Console() {}

Rc<String> Console::toString() {
  return std::make_shared<String>("[Console object]");
}

void Console::log(Rc<Any> string) {
  std::cout << string->toString()->_data << "\n";
}

void Console::log(NUMBER value) { std::cout << value << "\n"; }

#endif // __CPP_STL__CPP_STL_INCLUDE_STL_H
