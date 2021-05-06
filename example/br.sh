#!/bin/bash

node ../build/main.js example.ts

if [ $? -eq 0 ]; then
	clang++ -std=c++17 -c example.cc -I. -I../cpp_stl/include &&
	clang++ -std=c++17 example.o &&
	# llc --filetype=obj example.bc
	# clang ../stl/stl.a example.o
	./a.out
fi
