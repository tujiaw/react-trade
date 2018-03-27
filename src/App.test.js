

function first() {
    return new Promise((resolve, reject) => {
        return resolve('first');
    })
}

function second() {
    return first().then(json => {
        console.log(json)
        return Promise.resolve('second')
    })
}

second()