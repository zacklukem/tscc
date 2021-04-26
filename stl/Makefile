SRCS :=\
	print_double.c\
	rc.c

OBJS := $(SRCS:%=%.o)


stl.a: $(OBJS)
	ar -rc $@ $(OBJS)

%.c.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@