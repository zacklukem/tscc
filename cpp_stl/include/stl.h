#ifndef __CPP_STL__CPP_STL_INCLUDE_STL_H
#define __CPP_STL__CPP_STL_INCLUDE_STL_H

#define NUMBER double
#define UNDEFINED std::nullopt;

#include <algorithm>
#include <deque>
#include <functional>
#include <iostream>
#include <memory>
#include <optional>
#include <sstream>
#include <string>

#define Rc std::shared_ptr

class Any;
class String;
class Console;
template <class> class Array;

//=========//
//== Any ==//
//=========//

class Any {
public:
  virtual Rc<String> toString() = 0;
};

//============//
//== String ==//
//============//

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

//===========//
//== Array ==//
//===========//

template <class T> class Array : public Any {
public:
  NUMBER length;

  virtual Rc<String> toString() override {
    return std::make_shared<String>("[Array object]");
  };

  T operator[](NUMBER i) const { return this->_data[(std::size_t)i]; };

  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/at
  T at(NUMBER i) const {
    if (i < 0)
      return (*this)[this->length + i];
    return (*this)[i];
  }

  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/every
  bool every(std::function<bool(T)> callback) const {
    for (auto& el : this->_data) {
      if (!callback(el))
        return false;
    }
    return true;
  }

  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/concat
  // TODO: add varargs
  Rc<Array<T>> concat(Rc<Array<T>> other) {
    std::deque<T> r_vec(this->_data);
    r_vec.insert(r_vec.end(), other->_data.begin(), other->_data.end());
    return std::make_shared<Array<T>>(r_vec);
  }

  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter
  // TODO: add optional parameters
  Rc<Array<T>> filter(std::function<bool(T)> callback) {
    std::deque<T> vec;
    for (auto& el : this->_data) {
      if (callback(el))
        vec.push_back(el);
    }
    return std::make_shared<Array<T>>(vec);
  }

  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find
  std::optional<T> find(std::function<bool(T)> callback) {
    for (auto& el : this->_data) {
      if (callback(el))
        return std::make_optional<T>(el);
    }
    return UNDEFINED;
  }

  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findIndex
  NUMBER findIndex(std::function<bool(T)> callback) {
    for (double i = 0; i < this->length; i++) {
      if (callback((*this)[i]))
        return i;
    }
    return -1;
  }

  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/includes
  bool includes(T value) {
    for (auto& el : this->_data) {
      if (value == el)
        return true;
    }
    return false;
  }

  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/indexOf
  NUMBER indexOf(T value) {
    for (double i = 0; i < this->length; i++) {
      if ((*this)[i] == value)
        return i;
    }
    return -1;
  }

  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach
  virtual void forEach(std::function<void(T)> callback) {
    for (auto& el : this->_data)
      callback(el);
  }

  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/lastIndexOf
  NUMBER lastIndexOf(T value) {
    for (double i = this->length - 1; i >= 0; i--) {
      if ((*this)[i] == value)
        return i;
    }
    return -1;
  }

  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map
  template <class K> Rc<Array<K>> map(std::function<K(T)> callback) {
    // TODO: maybe use std::transform or something
    std::deque<K> vec(this->_data.size());
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

  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/push
  void push(T value) {
    this->_data.push_back(value);
    this->length++;
  }

  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/pop
  std::optional<T> pop() {
    if (this->length == 0)
      return UNDEFINED;
    auto result = this->_data.back();
    this->_data.pop_back();
    this->length--;
    return result;
  }

  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce
  // TODO: initial value
  T reduce(std::function<T(T, T)> callback) {
    T accumulator = this->_data.front();
    for (int i = 1; i < this->_data.size(); i++) {
      accumulator = callback(accumulator, this->_data[i]);
    }
    return accumulator;
  }

  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduceRight
  // TODO: initial value
  T reduceRight(std::function<T(T, T)> callback) {
    T accumulator = this->_data.back();
    for (int i = this->_data.size() - 2; i >= 0; i--) {
      accumulator = callback(accumulator, this->_data[i]);
    }
    return accumulator;
  }

  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reverse
  // TODO: figure out how to return Rc<thistype>
  void reverse() {
    std::deque<T> vec(this->_data.size());
    for (int i = this->_data.size() - 1; i >= 0; i--) {
      vec[this->_data.size() - i - 1] = this->_data[i];
    }
    this->_data = vec;
  }

  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reverse
  std::optional<T> shift() {
    if (this->length == 0)
      return UNDEFINED;
    auto result = this->_data.front();
    this->_data.pop_front();
    this->length--;
    return result;
  }

  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/unshift
  void unshift(T value) {
    this->_data.push_front(value);
    this->length++;
  }

  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/unshift
  bool some(std::function<bool(T)> callback) {
    for (auto& el : this->_data) {
      if (callback(el))
        return true;
    }
    return false;
  }

  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
  // TODO: figure out how to return Rc<thistype>
  void sort(std::function<bool(T, T)> comp) {
    std::sort(this->_data.begin(), this->_data.end(), comp);
  }

  Array<T>() : _data(), length(0){};

  Array<T>(std::deque<T> vec) : _data(vec) {
    this->length = static_cast<double>(vec.size());
  };

  Array<T>(std::initializer_list<T> list) : _data(list) {
    this->length = static_cast<NUMBER>(this->_data.size());
  };

private:
  std::deque<T> _data;
};

//=============//
//== Console ==//
//=============//

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
