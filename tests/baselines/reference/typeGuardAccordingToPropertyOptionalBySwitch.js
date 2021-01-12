//// [typeGuardAccordingToPropertyOptionalBySwitch.ts]
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


//// [typeGuardAccordingToPropertyOptionalBySwitch.js]
"use strict";
// unnecessary optional chain
function f1(u) {
    switch (typeof (u === null || u === void 0 ? void 0 : u.key1)) {
        case 'number':
            u.key1.key2;
            break;
        default:
            u.key1.key2;
            break;
    }
    switch (typeof (u === null || u === void 0 ? void 0 : u.key1)) {
        case 'undefined':
            u.key1.key2;
            break;
        default:
            u.key1.key2;
            break;
    }
}
// non-root optional chain
function f2(u) {
    var _a, _b;
    switch (typeof ((_a = u.key1) === null || _a === void 0 ? void 0 : _a.key2)) {
        case 'number':
            u.key1.key2;
            break;
        default:
            u.key1.key2;
            break;
    }
    switch (typeof ((_b = u.key1) === null || _b === void 0 ? void 0 : _b.key2)) {
        case 'undefined':
            u.key1.key2;
            break;
        default:
            u.key1.key2;
            break;
    }
}
function f2Plus(u) {
    var _a, _b;
    switch (typeof ((_a = u.key1) === null || _a === void 0 ? void 0 : _a.key2)) {
        case 'number':
        case 'undefined':
            u.key1.key2;
            break;
        default:
            u.key1.key2;
            break;
    }
    switch (typeof ((_b = u.key1) === null || _b === void 0 ? void 0 : _b.key2)) {
        case 'bigint':
            u.key1.key2;
            break;
        default:
            u.key1.key2;
            break;
    }
}
// root optional chain
function f3(u) {
    switch (typeof (u === null || u === void 0 ? void 0 : u.key1)) {
        case 'number':
            u.key1.key2;
            break;
        default:
            u.key1.key2;
            break;
    }
    switch (typeof (u === null || u === void 0 ? void 0 : u.key1)) {
        case 'undefined':
            u.key1.key2;
            break;
        default:
            u.key1.key2;
            break;
    }
}
// multi optional chain
function f4(u) {
    var _a, _b;
    switch (typeof ((_a = u === null || u === void 0 ? void 0 : u.key1) === null || _a === void 0 ? void 0 : _a.key2)) {
        case 'number':
            u.key1.key2;
            break;
        default:
            u.key1.key2;
            break;
    }
    switch (typeof ((_b = u === null || u === void 0 ? void 0 : u.key1) === null || _b === void 0 ? void 0 : _b.key2)) {
        case 'undefined':
            u.key1.key2;
            break;
        default:
            u.key1.key2;
            break;
    }
}
