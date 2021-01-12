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
    switch (typeof u?.key1) {
        case 'number':
            u.key1.key2;
            break;
        default:
            u.key1.key2;
            break;
    }
    switch (typeof u?.key1) {
        case 'undefined':
            u.key1.key2;
            break;
        default:
            u.key1.key2;
            break;
    }
}

// non-root optional chain
function f2(u: U1) {
    switch (typeof u.key1?.key2) {
        case 'number':
            u.key1.key2;
            break;
        default:
            u.key1.key2;
            break;
    }
    switch (typeof u.key1?.key2) {
        case 'undefined':
            u.key1.key2;
            break;
        default:
            u.key1.key2;
            break;
    }
}

function f2Plus(u: U1) {
    switch (typeof u.key1?.key2) {
        case 'number':
        case 'undefined':
            u.key1.key2;
            break;
        default:
            u.key1.key2;
            break;
    }
    switch (typeof u.key1?.key2) {
        case 'bigint':
            u.key1.key2;
            break;
        default:
            u.key1.key2;
            break;
    }
}

// root optional chain
function f3(u: U2) {
    switch (typeof u?.key1) {
        case 'number':
            u.key1.key2;
            break;
        default:
            u.key1.key2;
            break;
    }
    switch (typeof u?.key1) {
        case 'undefined':
            u.key1.key2;
            break;
        default:
            u.key1.key2;
            break;
    }
}

// multi optional chain
function f4(u: U2) {
    switch (typeof u?.key1?.key2) {
        case 'number':
            u.key1.key2;
            break;
        default:
            u.key1.key2;
            break;
    }
    switch (typeof u?.key1?.key2) {
        case 'undefined':
            u.key1.key2;
            break;
        default:
            u.key1.key2;
            break;
    }
}
