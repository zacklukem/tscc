#!/bin/bash

node ../build/main.js example.ts
clang -c example.c -I. -I../stl/include
clang ../stl/stl.a example.o

# llc --filetype=obj example.bc
# clang ../stl/stl.a example.o
./a.out
