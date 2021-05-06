#!/bin/bash

echo " <<== Building compiler ==>>"
npx tsc
if [ $? -eq 0 ]; then
  echo " <<== Building stl ==>>"
  # cd cpp_stl
  # make
  if [ $? -eq 0 ]; then
    # cd ..
    echo " <<== Building examples ==>>"
    cd example
    ./br.sh
    cd ..
  else
    echo FAIL
  fi
else
  echo FAIL
fi
