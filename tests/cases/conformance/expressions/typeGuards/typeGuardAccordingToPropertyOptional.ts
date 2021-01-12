// @strict: true

interface Foo1 {
    key1: {
        key2: number;
    } | undefined;
    f1: number;
}

interface Foo2 {
    key1: {
        key2: string
    } | undefined;
    f2: number;
}

interface Foo3 {
    key1: {
        key2: number;
    };
    f2: number;
}

type U1 = Foo1 | Foo2 | Foo3;
type U2 = Foo1 | Foo2 | Foo3 | undefined;

// unnecessary optional chain
function f1(u: U1) {
    if (typeof u?.key1 !== 'number') {
        u.key1.key2;
    }
    if (typeof u?.key1 === 'number') {
        u.key1.key2;
    }
    if (typeof u?.key1 !== 'undefined') {
        u.key1.key2;
    }
    if (typeof u?.key1 === 'undefined') {
        u.key1.key2;
    }
}

// non-root optional chain
function f2(u: U1) {
    if (typeof u.key1?.key2 !== 'number') {
        u.key1.key2;
    }
    if (typeof u.key1?.key2 === 'number') {
        u.key1.key2;
    }
    if (typeof u.key1?.key2 !== 'undefined') {
        u.key1.key2;
    }
    if (typeof u.key1?.key2 === 'undefined') {
        u.key1.key2;
    }
}

function f2Plus(u: U1) {
    if (typeof u.key1?.key2 === 'undefined' && typeof u.key1?.key2 === 'number') {
        u.key1.key2;
    }
    if (typeof u.key1?.key2 === 'undefined' || typeof u.key1?.key2 === 'number') {
        u.key1.key2;    // Error
    }
    if (typeof u.key1?.key2 === 'number' && typeof u.key1?.key2 === 'undefined') {
        u.key1.key2;
    }
    if (typeof u.key1?.key2 === 'number' || typeof u.key1?.key2 === 'undefined') {
        u.key1.key2;    // Error
    }
    if (typeof u.key1?.key2 === 'number' || typeof u.key1?.key2 !== 'undefined') {
        u.key1.key2;
    }
}

// root optional chain
function f3(u: U2) {
    if (typeof u?.key1 !== 'number') {
        u.key1.key2;
    }
    if (typeof u?.key1 === 'number') {
        u.key1.key2;
    }
    if (typeof u?.key1 !== 'undefined') {
        u.key1.key2;
    }
    if (typeof u?.key1 === 'undefined') {
        u.key1.key2;
    }
}

// multi optional chain
function f4(u: U2) {
    if (typeof u?.key1?.key2 !== 'number') {
        u.key1.key2;
    }
    if (typeof u?.key1?.key2 === 'number') {
        u.key1.key2;
    }
    if (typeof u?.key1?.key2 !== 'undefined') {
        u.key1.key2;
    }
    if (typeof u?.key1?.key2 === 'undefined') {
        u.key1.key2;
    }
}
