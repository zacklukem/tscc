#pragma once
#include "macro.h"
#include <cstdlib>
#include <functional>
#include <memory>
#include <string>
#include <vector>

#define Rc std::shared_ptr

class Any;
class String;

class Any {
public:
  virtual Rc<String> toString() = 0;
};

class String : public Any {
public:
  virtual Rc<String> toString();
  String(const char* initializer);

public:
  std::string _data;
};

class Console : public Any {
public:
  virtual Rc<String> toString();
  virtual void log(Rc<Any> value);
  virtual void log(NUMBER value);
  Console();
};

template <class T> class Array : public Any {
public:
  NUMBER length;

  virtual Rc<String> toString() {
    return std::make_shared<String>("[Array object]");
  };

  virtual void forEach(std::function<void(T)> callback) {
    for (auto el : this->_data)
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

  virtual void push(T value) {
    this->_data.push_back(value);
    this->length++;
  };

  T& operator[](NUMBER i) { return this->_data[(std::size_t)i]; };

  Array<T>() : _data(), length(0){};

  Array<T>(std::vector<T> vec) : _data(vec), length(0){};

  Array<T>(std::initializer_list<T> list)
      : _data(list), length((NUMBER)list.size()){};

private:
  std::vector<T> _data;
};

extern Rc<Console> console;
