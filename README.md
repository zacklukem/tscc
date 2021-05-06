# TSCC

TSCC is a typescript to C++ compiler. It is written in typescript (with the hope to eventually bootstrap).

The goal of TSCC is to follow the typescript specification if possible, but it probably won't be 100% compatible
because for now I don't plan to implement javascript-style dynamic objects where properties can be added at runtime.

See the road map for information about what has been implemented so far.

## Building

> Note: TSCC's build process is pretty janky right now because I didn't build it with
> other systems in mind.

### Requirements

- `node 14`
- `clang compiler` (to build the examples)
- `make` (to build the standard library)

First install the npm dependencies:

`npm install`

To run the compiler, just run `node build/main.js [arguments]`

To run the examples simply run `./build.sh`

## Example

```ts
class MyClass {
  first: number;
  second: number;
  third: number;
  constructor(first: number) {
    this.first = first;
    this.second = 12340000;
  }
  myMethod(arg: number): number {
    return this.second + arg;
  }
}

function add(a: number, b: number) {
  let c: number = 3;
  if (a == 2) {
    return b;
  } else if (a == 3) {
    return a;
  }
  return a + b;
}

function ts_main() {
  let val = new MyClass(9999);
  let a: number[] = [1.3, 2.4, 3.5, 4.6];

  let q: number[] = a.map((val: number) => val + 1);

  q.forEach((num: number): void => {
    console.log(num);
  });

  for (let i = 0; i < a.length; i += 1) {
    console.log(a[i]);
  }

  let m: string[] = ["a", "ab", "abc", "abcd"];

  console.log(m.join(":::"));

  m.forEach((el: string): void => {
    console.log(el);
  });

  console.log("Hello, world!" + "concat");
  console.log(1);

  for (let i: number = 0; i < 23; i += 1) {
    console.log(i);
  }

  console.log(val.myMethod(4321));

  let b = add(1, 2);

  let mine: (num: number) => string = (num: number): string => {
    console.log(num);
    return "hello, lambda";
  };

  console.log(mine(3.141592));

  console.log(val.first);
  return 0;
}
```

Becomes:

```cpp
#pragma clang diagnostic ignored "-Wparentheses-equality"
#include <stl.h>
class MyClass;
class MyClass {
public:
  double first;
  double second;
  double third;
  MyClass(double first);

  double myMethod(double arg);

};

//== BODY SECTION ==//
MyClass::MyClass(double first) {
  (this->first = first);
  (this->second = 12340000);
}

double MyClass::myMethod(double arg) {
  return (this->second + arg);
}

double add(double a, double b) {
  double c = 3;

  if ((a == 2)) {
    return b;
  } else if ((a == 3)) {
    return a;
  }
  return (a + b);
}

double ts_main() {
  std::shared_ptr<MyClass> val = std::make_shared<MyClass>(9999);

  std::shared_ptr<Array<double>> a = std::make_shared<Array<double>>(std::initializer_list<double> {1.3, 2.4, 3.5, 4.6});

  std::shared_ptr<Array<double>> q = a->map<double>([](double val) -> double {
    return (val + 1);
  });

  q->forEach([](double num) -> void {
    console->log(num);
  });
  for (double i = 0; (i < a->length); (i += 1)) {
    console->log((*a)[i]);
  }
  std::shared_ptr<Array<std::shared_ptr<String>>> m = std::make_shared<Array<std::shared_ptr<String>>>(std::initializer_list<std::shared_ptr<String>> {std::make_shared<String>("a"), std::make_shared<String>("ab"), std::make_shared<String>("abc"), std::make_shared<String>("abcd")});

  console->log(m->join(std::make_shared<String>(":::")));
  m->forEach([](std::shared_ptr<String> el) -> void {
    console->log(el);
  });
  console->log((std::make_shared<String>("Hello, world!") + std::make_shared<String>("concat")));
  console->log(1);
  for (double i = 0; (i < 23); (i += 1)) {
    console->log(i);
  }
  console->log(val->myMethod(4321));
  double b = add(1, 2);

  std::function<std::shared_ptr<String>(double)> mine = [](double num) -> std::shared_ptr<String> {
    console->log(num);
    return std::make_shared<String>("hello, lambda");
  };

  console->log(mine(3.141592));
  console->log(val->first);
  return 0;
}


#include <end.h>
```