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

function ts_main(): number {
  let val = new MyClass(9999);
  let a: number[] = [];
  a.push(1.3);
  a.push(2.4);
  a.push(3.5);
  a.push(4.6);

  for (let i = 0; i < a.length; i += 1) {
    console.log(a[i]);
  }

  let m: string[] = [];
  m.push("a");
  m.push("ab");
  m.push("abc");
  m.push("abcd");


  for (let i = 0; i < m.length; i += 1) {
    console.log(m[i]);
  }

  console.log("Hello, world!");
  console.log(1);

  for (let i: number = 0; i < 23; i += 1) {
    console.log(i);
  }

  console.log(val.myMethod(4321));

  let b = add(1, 2);

  let mine: () => void = (): void => {
    console.log(1.0);
  };

  mine();

  console.log(val.first);
  return 0;
}

// declare function console.log(d: number);

// function add(a: number, b: number): number {
//   return a + b;
// }

// function main(a: number): number {
//   // let obj: { first: number; next: number } = {};

//   let infer = new MyClass();

//   infer.first = 32;

//   console.log(infer.first);

//   let printMe: (d: number) => void = (d: number) => console.log(d);

//   for (let i: number = 0; i < 10; i++) {
//     if (i < 2) printMe(i);
//     else printMe(i + 32);
//   }

//   return 3;
// }
