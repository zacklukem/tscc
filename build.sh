#!/bin/bash

echo " <<== Building compiler ==>>"
npx tsc
if [ $? -eq 0 ]; then
  echo " <<== Building stl ==>>"
  cd stl
  make
  cd ..
  echo " <<== Building examples ==>>"
  cd example
  ./br.sh
  cd ..
else
  echo FAIL
fi
