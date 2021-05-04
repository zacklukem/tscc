#!/bin/bash

echo "<<== Formatting JS ==>>"
npx prettier --write .

echo "<<== Formatting CPP ==>>"
find cpp_stl -iname *.h -o -iname *.cc | xargs clang-format -i
