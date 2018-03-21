
const start = new Date().getTime();

function test(a) {
  const x = a || false;
  console.log(x)
}

test();
test(true)