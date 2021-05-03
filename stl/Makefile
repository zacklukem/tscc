BUILD_DIR := ./build

SRCS :=\
	src/print_double.c\
	src/rc.c\
	src/string.c\
	src/number.c\
	src/console.c\
	src/array.c

OBJS := $(SRCS:%=$(BUILD_DIR)/%.o)

stl.a: $(OBJS)
	ar -rc $@ $(OBJS)

$(BUILD_DIR)/%.c.o: %.c
	mkdir -p $(dir $@)
	$(CC) $(CFLAGS) -c $< -o $@ -Iinclude