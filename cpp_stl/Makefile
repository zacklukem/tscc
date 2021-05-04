BUILD_DIR := ./build

SRCS :=\
	src/console.cc\
	src/string.cc\
	src/array.cc

OBJS := $(SRCS:%=$(BUILD_DIR)/%.o)

stl.a: $(OBJS)
	ar -rc $@ $(OBJS)

$(BUILD_DIR)/%.cc.o: %.cc
	mkdir -p $(dir $@)
	$(CC) $(CPPFLAGS) -std=c++17 -c $< -o $@ -Iinclude