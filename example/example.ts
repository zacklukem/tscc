class MyClass {
  first: number;
  second: number;
  third: number;
  constructor(first: number) {
    this.first = first;
    this.second = 12340000;
  }
  myMethod(arg: number): number {
    return this.second + arg;
  }
}

function add(a: number, b: number) {
  let c: number = 3;
  if (a == 2) {
    return b;
  } else if (a == 3) {
    return a;
  }
  return a + b;
}

function ts_main() {
  let val = new MyClass(9999);
  let a: number[] = [1.3, 2.4, 3.5, 4.6];

  let q: number[] = a.map((val: number) => val + 1);

  q.forEach((num: number): void => {
    console.log(num);
  });

  for (let i = 0; i < a.length; i += 1) {
    console.log(a[i]);
  }

  let m: string[] = ["a", "ab", "abc", "abcd"];

  m.forEach((el: string): void => {
    console.log(el);
  });

  console.log("Hello, world!");
  console.log(1);

  for (let i: number = 0; i < 23; i += 1) {
    console.log(i);
  }

  console.log(val.myMethod(4321));

  let b = add(1, 2);

  let mine: (num: number) => string = (num: number): string => {
    console.log(num);
    return "hello, lambda";
  };

  console.log(mine(3.141592));

  console.log(val.first);
  return 0;
}
