cmake_minimum_required(VERSION 3.12.0)
project(cpp_stl)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED true)

find_package(GTest REQUIRED)

set(SOURCES
  tests/array.cc
)

set(INCLUDE_DIRS
  include/
)

add_executable(stl_tests ${SOURCES})
target_include_directories(stl_tests PRIVATE ${INCLUDE_DIRS} ${GTEST_INCLUDE_DIRS})
target_link_libraries(stl_tests ${GTEST_BOTH_LIBRARIES})

add_custom_target(test
  COMMAND ./stl_tests
  DEPENDS stl_tests
)