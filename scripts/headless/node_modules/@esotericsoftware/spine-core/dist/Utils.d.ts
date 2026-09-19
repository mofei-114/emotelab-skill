/******************************************************************************
 * Spine Runtimes License Agreement
 * Last updated April 5, 2025. Replaces all prior versions.
 *
 * Copyright (c) 2013-2025, Esoteric Software LLC
 *
 * Integration of the Spine Runtimes into software or otherwise creating
 * derivative works of the Spine Runtimes is permitted under the terms and
 * conditions of Section 2 of the Spine Editor License Agreement:
 * http://esotericsoftware.com/spine-editor-license
 *
 * Otherwise, it is permitted to integrate the Spine Runtimes into software
 * or otherwise create derivative works of the Spine Runtimes (collectively,
 * "Products"), provided that each user of the Products must obtain their own
 * Spine Editor license and redistribution of the Products in any form must
 * include this license and copyright notice.
 *
 * THE SPINE RUNTIMES ARE PROVIDED BY ESOTERIC SOFTWARE LLC "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL ESOTERIC SOFTWARE LLC BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES,
 * BUSINESS INTERRUPTION, OR LOSS OF USE, DATA, OR PROFITS) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THE SPINE RUNTIMES, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *****************************************************************************/
/** biome-ignore-all lint/complexity/noStaticOnlyClass: too much things to update */
import type { Skeleton } from "./Skeleton.js";
export interface StringMap<T> {
    [key: string]: T;
}
export declare class IntSet {
    array: (number | undefined)[];
    add(value: number): boolean;
    contains(value: number): boolean;
    remove(value: number): void;
    clear(): void;
}
export declare class StringSet {
    entries: StringMap<boolean>;
    size: number;
    add(value: string): boolean;
    addAll(values: string[]): boolean;
    contains(value: string): boolean;
    clear(): void;
}
export type NumberArrayLike = Array<number> | Float32Array;
export type IntArrayLike = Array<number> | Int16Array;
export interface Disposable {
    dispose(): void;
}
export interface Restorable {
    restore(): void;
}
export declare class Color {
    r: number;
    g: number;
    b: number;
    a: number;
    static WHITE: Color;
    static RED: Color;
    static GREEN: Color;
    static BLUE: Color;
    static MAGENTA: Color;
    constructor(r?: number, g?: number, b?: number, a?: number);
    set(r: number, g: number, b: number, a: number): this;
    setFromColor(c: Color): this;
    setFromString(hex: string): this;
    add(r: number, g: number, b: number, a: number): this;
    clamp(): this;
    static rgba8888ToColor(color: Color, value: number): void;
    static rgb888ToColor(color: Color, value: number): void;
    toRgb888(): number;
    static fromString(hex: string, color?: Color): Color;
}
export declare class MathUtils {
    static epsilon: number;
    static epsilon2: number;
    static PI: number;
    static PI2: number;
    static invPI2: number;
    static radiansToDegrees: number;
    static radDeg: number;
    static degreesToRadians: number;
    static degRad: number;
    static clamp(value: number, min: number, max: number): number;
    static cosDeg(degrees: number): number;
    static sinDeg(degrees: number): number;
    static atan2Deg(y: number, x: number): number;
    static signum(value: number): number;
    static toInt(x: number): number;
    static cbrt(x: number): number;
    static randomTriangular(min: number, max: number): number;
    static randomTriangularWith(min: number, max: number, mode: number): number;
    static isPowerOfTwo(value: number): boolean | 0;
}
export declare abstract class Interpolation {
    static readonly linear: Interpolation;
    /** Aka "smoothstep". */
    static readonly smooth: Interpolation;
    /** Slow, then fast. */
    static readonly slowFast: Interpolation;
    /** Fast, then slow. */
    static readonly fastSlow: Interpolation;
    static readonly circle: Interpolation;
    protected abstract applyInternal(a: number): number;
    apply(a: number): number;
    apply(start: number, end: number, a: number): number;
}
export declare class Pow extends Interpolation {
    protected power: number;
    constructor(power: number);
    applyInternal(a: number): number;
}
export declare class PowOut extends Pow {
    constructor(power: number);
    applyInternal(a: number): number;
}
export declare class Utils {
    static SUPPORTS_TYPED_ARRAYS: boolean;
    static arrayCopy<T>(source: ArrayLike<T>, sourceStart: number, dest: ArrayLike<T>, destStart: number, numElements: number): void;
    static arrayFill<T>(array: ArrayLike<T>, fromIndex: number, toIndex: number, value: T): void;
    static setArraySize<T>(array: Array<T>, size: number, value?: any): Array<T>;
    static ensureArrayCapacity<T>(array: Array<T>, size: number, value?: any): Array<T>;
    static newArray<T>(size: number, defaultValue: T): Array<T>;
    static newFloatArray(size: number): NumberArrayLike;
    static newShortArray(size: number): IntArrayLike;
    static toFloatArray(array: Array<number>): number[] | Float32Array;
    static toSinglePrecision(value: number): number;
    static webkit602BugfixHelper(alpha: number): void;
    static contains<T>(array: Array<T>, element: T, identity?: boolean): boolean;
    static enumValue(type: any, name: string): any;
}
export declare class DebugUtils {
    static logBones(skeleton: Skeleton): void;
}
export declare class Pool<T> {
    private items;
    private instantiator;
    constructor(instantiator: () => T);
    obtain(): T;
    free(item: T): void;
    freeAll(items: ArrayLike<T>): void;
    clear(): void;
}
export declare class Vector2 {
    x: number;
    y: number;
    constructor(x?: number, y?: number);
    set(x: number, y: number): Vector2;
    length(): number;
    normalize(): this;
}
export declare class TimeKeeper {
    maxDelta: number;
    framesPerSecond: number;
    delta: number;
    totalTime: number;
    private lastTime;
    private frameCount;
    private frameTime;
    update(): void;
}
export interface ArrayLike<T> {
    length: number;
    [n: number]: T;
}
export declare class WindowedMean {
    values: Array<number>;
    addedValues: number;
    lastValue: number;
    mean: number;
    dirty: boolean;
    constructor(windowSize?: number);
    hasEnoughData(): boolean;
    addValue(value: number): void;
    getMean(): number;
}
