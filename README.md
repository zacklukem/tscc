# TSCC

TSCC is a typescript to C++ compiler. It is written in typescript (with the hope to eventually bootstrap).

The goal of TSCC is to follow the typescript specification if possible, but it probably won't be 100% compatible
because for now I don't plan to implement javascript-style dynamic objects where properties can be added at runtime.

See the road map for information about what has been implemented so far.

## Building

> Note: TSCC's build process is pretty janky right now because I didn't build it with
> other systems in mind.

### Requirements

- `node 14`
- `clang compiler` (to build the examples)
- `make` (to build the standard library)

First install the npm dependencies:

`npm install`

To run the compiler, just run `node build/main.js [arguments]`

To run the examples simply run `./build.sh`
