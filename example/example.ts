function add(a: number, b: number): number {
	return a + b;
}

function main(a: number): number {

	let printMe: (d: number) => void = (d: number) => printDouble(d);

	for (let i: number = 0; i < 10; i++) {
		if (i < 2)
			printMe(i);
		else
			printMe(i + 32);
	}

	return 3;
}