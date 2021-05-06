#!/bin/bash

echo " <<== Building compiler ==>>"
npx tsc
echo " <<== Running stl tests ==>>"
pushd cpp_stl
cmake --build . --target test
popd
if [ $? -eq 0 ]; then
  cd example
  ./br.sh
  cd ..
fi
