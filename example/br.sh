#!/bin/bash

node ../build/main.js example.ts
llc --filetype=obj example.bc
gcc -c printDouble.c
gcc printDouble.o example.o
./a.out
