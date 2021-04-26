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

function add(a: number, b: number): number {
  let c: number = 3;
  if (a == 2) {
    return b;
  } else if (a == 3) {
    return a;
  }
  return a + b;
}

function main(): number {
  let val: MyClass = new MyClass(9999);

  for (let i: number = 0; i < 23; i += 1) {
    printDouble(i);
  }

  printDouble(val.myMethod(4321));

  let a: number = add(1, 2);

  let mine: () => void = (): void => {
    printDouble(1.0);
  };

  mine();

  printDouble(val.first);
  return 0;
}

// declare function printDouble(d: number);

// function add(a: number, b: number): number {
//   return a + b;
// }

// function main(a: number): number {
//   // let obj: { first: number; next: number } = {};

//   let infer = new MyClass();

//   infer.first = 32;

//   printDouble(infer.first);

//   let printMe: (d: number) => void = (d: number) => printDouble(d);

//   for (let i: number = 0; i < 10; i++) {
//     if (i < 2) printMe(i);
//     else printMe(i + 32);
//   }

//   return 3;
// }
