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
import type { BoneData } from "./BoneData.js";
import type { BonePose } from "./BonePose.js";
import { ConstraintData } from "./ConstraintData.js";
import type { Skeleton } from "./Skeleton.js";
import { TransformConstraint } from "./TransformConstraint.js";
import { TransformConstraintPose } from "./TransformConstraintPose.js";
/** Stores the setup pose for a {@link TransformConstraint}.
 *
 * See [Transform constraints](http://esotericsoftware.com/spine-transform-constraints) in the Spine User Guide. */
export declare class TransformConstraintData extends ConstraintData<TransformConstraint, TransformConstraintPose> {
    static readonly ROTATION = 0;
    static readonly X = 1;
    static readonly Y = 2;
    static readonly SCALEX = 3;
    static readonly SCALEY = 4;
    static readonly SHEARY = 5;
    /** The bones that will be modified by this transform constraint. */
    bones: BoneData[];
    /** The bone whose world transform will be copied to the constrained bones. */
    set source(source: BoneData);
    get source(): BoneData;
    private _source;
    offsets: number[];
    /** An offset added to the constrained bone X translation. */
    offsetX: number;
    /** An offset added to the constrained bone Y translation. */
    offsetY: number;
    /** Reads the source bone's local transform instead of its world transform. */
    localSource: boolean;
    /** Sets the constrained bones' local transforms instead of their world transforms. */
    localTarget: boolean;
    /** Adds the source bone transform to the constrained bones instead of setting it absolutely. */
    additive: boolean;
    /** Prevents constrained bones from exceeding the ranged defined by {@link ToProperty.offset} and {@link ToProperty.max}. */
    clamp: boolean;
    /** The mapping of transform properties to other transform properties. */
    readonly properties: Array<FromProperty>;
    constructor(name: string);
    create(skeleton: Skeleton): TransformConstraint;
    /** An offset added to the constrained bone rotation. */
    getOffsetRotation(): number;
    setOffsetRotation(offsetRotation: number): void;
    /** An offset added to the constrained bone X translation. */
    getOffsetX(): number;
    setOffsetX(offsetX: number): void;
    /** An offset added to the constrained bone Y translation. */
    getOffsetY(): number;
    setOffsetY(offsetY: number): void;
    /** An offset added to the constrained bone scaleX. */
    getOffsetScaleX(): number;
    setOffsetScaleX(offsetScaleX: number): void;
    /** An offset added to the constrained bone scaleY. */
    getOffsetScaleY(): number;
    setOffsetScaleY(offsetScaleY: number): void;
    /** An offset added to the constrained bone shearY. */
    getOffsetShearY(): number;
    setOffsetShearY(offsetShearY: number): void;
}
/** Source property for a {@link TransformConstraint}. */
export declare abstract class FromProperty {
    /** The value of this property that corresponds to {@link ToProperty.offset}. */
    offset: number;
    /** Constrained properties. */
    readonly to: Array<ToProperty>;
    /** Reads this property from the specified bone. */
    abstract value(skeleton: Skeleton, source: BonePose, local: boolean, offsets: Array<number>): number;
}
/** Constrained property for a {@link TransformConstraint}. */
export declare abstract class ToProperty {
    /** The value of this property that corresponds to {@link FromProperty.offset}. */
    offset: number;
    /** The maximum value of this property when {@link TransformConstraintData.clamp clamped}. */
    max: number;
    /** The scale of the {@link FromProperty} value in relation to this property. */
    scale: number;
    /** Reads the mix for this property from the specified constraint. */
    abstract mix(pose: TransformConstraintPose): number;
    /** Applies the value to this property. */
    abstract apply(skeleton: Skeleton, pose: TransformConstraintPose, bone: BonePose, value: number, local: boolean, additive: boolean): void;
}
export declare class FromRotate extends FromProperty {
    value(skeleton: Skeleton, source: BonePose, local: boolean, offsets: Array<number>): number;
}
export declare class ToRotate extends ToProperty {
    mix(pose: TransformConstraintPose): number;
    apply(skeleton: Skeleton, pose: TransformConstraintPose, bone: BonePose, value: number, local: boolean, additive: boolean): void;
}
export declare class FromX extends FromProperty {
    value(skeleton: Skeleton, source: BonePose, local: boolean, offsets: Array<number>): number;
}
export declare class ToX extends ToProperty {
    mix(pose: TransformConstraintPose): number;
    apply(skeleton: Skeleton, pose: TransformConstraintPose, bone: BonePose, value: number, local: boolean, additive: boolean): void;
}
export declare class FromY extends FromProperty {
    value(skeleton: Skeleton, source: BonePose, local: boolean, offsets: Array<number>): number;
}
export declare class ToY extends ToProperty {
    mix(pose: TransformConstraintPose): number;
    apply(skeleton: Skeleton, pose: TransformConstraintPose, bone: BonePose, value: number, local: boolean, additive: boolean): void;
}
export declare class FromScaleX extends FromProperty {
    value(skeleton: Skeleton, source: BonePose, local: boolean, offsets: Array<number>): number;
}
export declare class ToScaleX extends ToProperty {
    mix(pose: TransformConstraintPose): number;
    apply(skeleton: Skeleton, pose: TransformConstraintPose, bone: BonePose, value: number, local: boolean, additive: boolean): void;
}
export declare class FromScaleY extends FromProperty {
    value(skeleton: Skeleton, source: BonePose, local: boolean, offsets: Array<number>): number;
}
export declare class ToScaleY extends ToProperty {
    mix(pose: TransformConstraintPose): number;
    apply(skeleton: Skeleton, pose: TransformConstraintPose, bone: BonePose, value: number, local: boolean, additive: boolean): void;
}
export declare class FromShearY extends FromProperty {
    value(skeleton: Skeleton, source: BonePose, local: boolean, offsets: Array<number>): number;
}
export declare class ToShearY extends ToProperty {
    mix(pose: TransformConstraintPose): number;
    apply(skeleton: Skeleton, pose: TransformConstraintPose, bone: BonePose, value: number, local: boolean, additive: boolean): void;
}
