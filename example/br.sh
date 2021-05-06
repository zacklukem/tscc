#!/bin/bash

echo " <<== Building examples ==>>"
node ../build/main.js example.ts

if [ $? -eq 0 ]; then
  echo " <<== Compiling generated C++ ==>>"
	clang++ -std=c++17 -c example.cc -I. -I../cpp_stl/include &&
	clang++ -std=c++17 example.o
  echo
  if [ $? -eq 0 ]; then
    echo " <<== Running examples ==>>"
    ./a.out
  fi
fi
