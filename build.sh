#!/bin/bash

npx tsc
if [ $? -eq 0 ]; then
  cd example
  ./br.sh
  cd ..
else
  echo FAIL
fi
