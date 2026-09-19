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
import type { Bone } from "./Bone.js";
import type { BonePose } from "./BonePose.js";
import { Constraint } from "./Constraint.js";
import { ScaleYMode } from "./ConstraintData.js";
import type { IkConstraintData } from "./IkConstraintData.js";
import { IkConstraintPose } from "./IkConstraintPose.js";
import type { Physics } from "./Physics.js";
import type { Skeleton } from "./Skeleton.js";
/** Adjusts the local rotation of 1 or 2 constrained bones so the world position of the tip of the last bone is as close to the
 * target bone as possible.
 *
 * See [IK constraints](http://esotericsoftware.com/spine-ik-constraints) in the Spine User Guide. */
export declare class IkConstraint extends Constraint<IkConstraint, IkConstraintData, IkConstraintPose> {
    /** The 1 or 2 bones that will be modified by this IK constraint. */
    readonly bones: Array<BonePose>;
    /** The bone that is the IK target. */
    target: Bone;
    constructor(data: IkConstraintData, skeleton: Skeleton);
    copy(skeleton: Skeleton): IkConstraint;
    update(skeleton: Skeleton, physics: Physics): void;
    sort(skeleton: Skeleton): void;
    isSourceActive(): boolean;
    /** Applies 1 bone IK. The target is specified in the world coordinate system. */
    static apply(skeleton: Skeleton, bone: BonePose, targetX: number, targetY: number, compress: boolean, stretch: boolean, scaleYMode: ScaleYMode, mix: number): void;
    /** Applies 2 bone IK. The target is specified in the world coordinate system.
     * @param child A direct descendant of the parent bone. */
    static apply(skeleton: Skeleton, parent: BonePose, child: BonePose, targetX: number, targetY: number, bendDir: number, stretch: boolean, scaleYMode: ScaleYMode, softness: number, mix: number): void;
    private static apply1;
    /** Applies 2 bone IK. The target is specified in the world coordinate system.
     * @param child A direct descendant of the parent bone. */
    private static apply2;
}
