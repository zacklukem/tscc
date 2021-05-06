#include <gtest/gtest.h>
#include <stl.h>

#define ARRAY(type, ...)                                                       \
  std::make_shared<Array<type>>(std::initializer_list<type>{__VA_ARGS__});

TEST(Array, length) {
  auto array = ARRAY(double, 5, 12, 8, 130, 44);
  EXPECT_EQ(array->length, 5);
}

TEST(Array, accessor) {
  auto array = ARRAY(double, 5, 12, 8, 130, 44);
  EXPECT_EQ((*array)[0], 5);
  EXPECT_EQ((*array)[3], 130);
}

// const array1 = [5, 12, 8, 130, 44];
// let index = 2;
// console.log(`Using an index of ${index} the item returned is
// ${array1.at(index)}`);
// // expected output: "Using an index of 2 the item returned is 8"
// index = -2;
// console.log(`Using an index of ${index} item returned is
// ${array1.at(index)}`);
// // expected output: "Using an index of -2 item returned is 130"
TEST(Array, at) {
  auto array = ARRAY(double, 5, 12, 8, 130, 44);
  EXPECT_EQ(array->at(2), 8);
  EXPECT_EQ(array->at(-2), 130);
}

// const array1 = ['a', 'b', 'c'];
// const array2 = ['d', 'e', 'f'];
// const array3 = array1.concat(array2);

// console.log(array3);
// // expected output: Array ["a", "b", "c", "d", "e", "f"]
TEST(Array, concat) {
  auto array1 = ARRAY(double, 1, 2, 3, 4, 5);
  auto array2 = ARRAY(double, 6, 7, 8, 9, 10);
  auto array3 = array1->concat(array2);
  for (double i = 0; i < 10; i++) {
    EXPECT_EQ((*array3)[i], i + 1);
  }
}

TEST(Array, filter) {
  auto array1 = ARRAY(double, 1, 2, 3, 4, 5);
  auto array2 = array1->filter([](double el) { return el < 5 && el > 1; });
  EXPECT_EQ(array2->length, 3);
  for (double i = 0; i < 3; i++) {
    EXPECT_EQ((*array2)[i], i + 2);
  }
}

TEST(Array, find) {
  auto array1 = ARRAY(double, 1, 2, 3, 4, 5);
  auto three = array1->find([](double el) { return el == 3; });
  EXPECT_EQ(three, 3);
  auto undef = array1->find([](double el) { return el == 89; });
  EXPECT_EQ(undef, std::nullopt);
}

TEST(Array, findIndex) {
  auto array1 = ARRAY(double, 1, 2, 3, 4, 5);
  auto two = array1->findIndex([](double el) { return el == 3; });
  EXPECT_EQ(two, 2);
  auto neg_one = array1->findIndex([](double el) { return el == 89; });
  EXPECT_EQ(neg_one, -1);
}

TEST(Array, includes) {
  auto array1 = ARRAY(double, 1, 2, 3, 4, 5);
  auto three = array1->includes(3);
  EXPECT_EQ(three, true);
  auto twenty = array1->includes(20);
  EXPECT_EQ(twenty, false);
}

TEST(Array, indexOf) {
  auto array1 = ARRAY(double, 1, 2, 3, 4, 5, 4, 3, 2);
  auto two = array1->indexOf(3);
  EXPECT_EQ(two, 2);
  auto neg_one = array1->indexOf(89);
  EXPECT_EQ(neg_one, -1);
}

TEST(Array, lastIndexOf) {
  auto array1 = ARRAY(double, 1, 2, 3, 4, 5, 4, 3, 2);
  auto six = array1->lastIndexOf(3);
  EXPECT_EQ(six, 6);
  auto neg_one = array1->lastIndexOf(89);
  EXPECT_EQ(neg_one, -1);
}

TEST(Array, every) {
  auto array1 = ARRAY(double, 1, 2, 3, 4, 5);
  auto less_than_6 = array1->every([](double el) { return el < 6; });
  EXPECT_EQ(less_than_6, true);

  auto less_than_5 = array1->every([](double el) { return el < 5; });
  EXPECT_EQ(less_than_5, false);

  double last_called = 999;
  auto less_than_4 = array1->every([&last_called](double el) mutable {
    last_called = el;
    return el < 4;
  });
  EXPECT_EQ(less_than_4, false);
  EXPECT_EQ(last_called, 4);
}

TEST(Array, forEach) {
  auto array1 = ARRAY(double, 1, 2, 3, 4, 5);
  double i = 1;
  array1->forEach([&i](double el) mutable {
    EXPECT_EQ(el, i);
    i++;
  });
}

TEST(Array, map) {
  auto array1 = ARRAY(double, 1, 2, 3, 4, 5);
  auto array2 = array1->map<double>([](double el) { return el + 1; });
  EXPECT_EQ(array1->length, array2->length);
  for (double i = 0; i < array2->length; i++) {
    EXPECT_EQ((*array2)[i], i + 2);
  }
}

TEST(Array, push) {
  auto array1 = ARRAY(double, 1, 2, 3, 4, 5);
  array1->push(6);
  array1->push(7);
  array1->push(8);
  EXPECT_EQ(array1->length, 8);
  for (double i = 0; i < array1->length; i++) {
    EXPECT_EQ((*array1)[i], i + 1);
  }
}

TEST(Array, pop) {
  auto array1 = ARRAY(double, 1, 2, 3);
  EXPECT_EQ(array1->pop(), 3);
  EXPECT_EQ(array1->length, 2);
  EXPECT_EQ(array1->pop(), 2);
  EXPECT_EQ(array1->length, 1);
  EXPECT_EQ(array1->pop(), 1);
  EXPECT_EQ(array1->length, 0);
  EXPECT_EQ(array1->pop(), std::nullopt);
  EXPECT_EQ(array1->length, 0);
}

TEST(Array, reduce) {
  auto array1 = ARRAY(double, 1, 2, 3, 4, 5);
  auto val = array1->reduce([](double acc, double val) { return acc - val; });
  EXPECT_EQ(val, -13);
}

TEST(Array, reduceRight) {
  auto array1 = ARRAY(double, 1, 2, 3, 4, 5);
  auto val =
      array1->reduceRight([](double acc, double val) { return acc - val; });
  EXPECT_EQ(val, -5);
}

TEST(Array, reverse) {
  auto array1 = ARRAY(double, 1, 2, 3, 4, 5);
  array1->reverse();
  EXPECT_EQ(array1->at(0), 5);
  EXPECT_EQ(array1->at(1), 4);
  EXPECT_EQ(array1->at(2), 3);
  EXPECT_EQ(array1->at(3), 2);
  EXPECT_EQ(array1->at(4), 1);
}

TEST(Array, shift) {
  auto array1 = ARRAY(double, 1, 2, 3);
  EXPECT_EQ(array1->shift(), 1);
  EXPECT_EQ(array1->length, 2);
  EXPECT_EQ(array1->shift(), 2);
  EXPECT_EQ(array1->length, 1);
  EXPECT_EQ(array1->shift(), 3);
  EXPECT_EQ(array1->length, 0);
  EXPECT_EQ(array1->shift(), std::nullopt);
  EXPECT_EQ(array1->length, 0);
}

TEST(Array, unshift) {
  auto array1 = ARRAY(double, 4, 5);
  array1->unshift(3);
  array1->unshift(2);
  array1->unshift(1);
  EXPECT_EQ(array1->length, 5);
  for (double i = 0; i < array1->length; i++) {
    EXPECT_EQ((*array1)[i], i + 1);
  }
}

TEST(Array, some) {
  auto array1 = ARRAY(double, 1, 2, 3, 4, 5);
  auto three = array1->some([](double el) { return el == 3; });
  EXPECT_EQ(three, true);
  auto nope = array1->some([](double el) { return el == 89; });
  EXPECT_EQ(nope, false);
}

TEST(Array, sort) {
  auto array1 = ARRAY(double, 3, 2, 5, 1, 4);
  array1->sort([](double a, double b) { return a < b; });
  for (double i = 0; i < array1->length; i++) {
    EXPECT_EQ((*array1)[i], i + 1);
  }
}