# Objects and Garbage Collection

Because the compiler generates different code for classes vs standard typescript
objects they have different behaviors.

Classes have static sizes so they cannot have members that are not known at runtime.

```ts
class MyClass {
  first: number;
  second: number;
  third?: number; // OK because this is just included in the size calculation
  fourth: number | boolean; // Computed as max(size of each element)
}

let my_class = new MyClass(); // Allocates sizeof(MyClass) on the heap
let my_any_class = my_class as any; // Ok for now
my_any_class.fifth = 32; // Not ok because my_class cannot be dynamically resized
```

In contrast, standard js objects are represented as maps:
(which comes at a _significant_ performance cost)

```ts
let my_obj = ({
  first: 0,
  second: 3,
}(my_obj as any).third = 3); // OK because my_obj is dynamically resized
```
