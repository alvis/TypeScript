// @strict: true
interface Dict<T> {
    [index: string]: T;
    [index: symbol]: T;
    [index: number]: T;
}

const keyMap: Dict<number> = {};

function set<T extends object>(index: keyof T) {
    keyMap[index] = 1;
}

interface Dict2<T> {
    [index: string | number | symbol]: T;
}

const keyMap2: Dict2<number> = {};

function set2<T extends object>(index: keyof T) {
    keyMap2[index] = 1;
}

interface Dict3<T> {
    [index: string | symbol]: T;
}

const keyMap3: Dict3<number> = {};

function set3<T extends object>(index: keyof T) {
    keyMap3[index] = 1;
}

interface Dict4<T> {
    [index: string]: T;
    [index: symbol]: T;
}

const keyMap4: Dict4<number> = {};

function set4<T extends object>(index: keyof T) {
    keyMap4[index] = 1;
}

/**
 * Key can only be number, string or symbol
 * */
class SimpleMapMap<K extends PropertyKey, V> {
    private o: { [k: K]: V } = {};

    public has(k: K): boolean {
        return k in this.o;
    }

    public get(k: K): V {
        return this.o[k];
    }

    public set(k: K, v: V) {
        this.o[k] = v;
    }

    public getMap(k: K): V {
        if (k in this.o) {
            return this.o[k];
        }
        const res = new SimpleMapMap<K, V>();
        this.o[k] = res as any as V;
        return res as any as V;
    }

    public clear() {
        this.o = {};
    }
}

class SimpleMapMap2<K extends PropertyKey, V> {
    private o: { [k: PropertyKey]: V } = {};

    public has(k: K): boolean {
        return k in this.o;
    }

    public get(k: K): V {
        return this.o[k];
    }

    public set(k: K, v: V) {
        this.o[k] = v;
    }

    public getMap(k: K): V {
        if (k in this.o) {
            return this.o[k];
        }
        const res = new SimpleMapMap2<K, V>();
        this.o[k] = res as any as V;
        return res as any as V;
    }

    public clear() {
        this.o = {};
    }
}
