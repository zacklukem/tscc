#include <stdlib.h>

// TODO: maybe make this more efficient

void* c_intrinsic_alloc_rc(size_t size) {
  // Malloc object
  void* ptr = malloc(size + sizeof(size_t));

  // Set reference count to 1
  ((size_t*)ptr)[0] = 1;

  // Return pointer to data
  return ptr + sizeof(size_t);
}

void c_intrinsic_move_rc(void* ptr) {
  void* root_ptr = ptr - sizeof(size_t);
  (*((size_t*)root_ptr))++;
}

void c_intrinsic_free_rc(void* ptr) {
  void* root_ptr = ptr - sizeof(size_t);

  size_t* rc = ((size_t*)root_ptr);

  if (*rc == 1) {
    free(root_ptr);
  } else {
    // Decrement rc
    (*rc)--;
  }
}
