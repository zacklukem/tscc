BUILD_DIR := ./build

SRCS :=\
  a.cc

OBJS := $(SRCS:%=$(BUILD_DIR)/%.o)

stl.a: $(OBJS)
	ar -rc $@ $(OBJS)

$(BUILD_DIR)/%.cc.o: %.cc
	mkdir -p $(dir $@)
	$(CC) $(CPPFLAGS) -std=c++17 -c $< -o $@ -Iinclude