#!/bin/bash

node ../build/main.js example.ts
llc --filetype=obj example.bc
clang ../stl/stl.a example.o
./a.out
