#pragma once
#define NUMBER double

#define CLASS(class_name) class_name ## _t*

#define METHOD_TYPE(class_name, method_name) _ ## class_name ## _ ## method_name ## _t

#define METHOD(class_name, method_name) class_name ## _ ## method_name

#define CLASS_CONSTRUCTOR_NAME(class_name)\
	class_name ## _constructor

#define DECLARE_CLASS(class_name)\
	typedef struct class_name class_name ## _t;\
	struct class_name

#define INIT_METHOD(class_name, method_name)\
  this->method_name = METHOD(class_name, method_name);

#define CLASS_METHOD(class_name, method_name, f_args...)\
	METHOD(class_name, method_name)(CLASS(class_name) this, ##f_args)

#define CLASS_CONSTRUCTOR(class_name, f_args...)\
	CLASS(class_name) CLASS_CONSTRUCTOR_NAME(class_name)(f_args)

#define CLASS_CONSTRUCTOR_IMPL(class_name, f_args...)\
	CLASS_CONSTRUCTOR(class_name, ##f_args) {\
  CLASS(class_name) this = c_intrinsic_alloc_rc(sizeof(struct class_name));

#define CLASS_CONSTRUCTOR_END(class_name)\
  return this;\
	}

#define DEFINE_CLASS_METHOD(ret_type, class_name, method_name, f_args...)\
	typedef ret_type (*METHOD_TYPE(class_name, method_name))(class_name ## _t* this, ##f_args);

#define DECLARE_CLASS_METHOD(ret_type, class_name, method_name, f_args...)\
	DEFINE_CLASS_METHOD(ret_type, class_name, method_name, ##f_args)\
	ret_type CLASS_METHOD(class_name, method_name, ##f_args)

#define DECLARE_CLASS_CONSTRUCTOR(class_name, f_args...)\
	CLASS(class_name) CLASS_CONSTRUCTOR_NAME(class_name)(f_args)

#define SDECLARE_CLASS_METHOD(class_name, method_name)\
	METHOD_TYPE(class_name, method_name) method_name
