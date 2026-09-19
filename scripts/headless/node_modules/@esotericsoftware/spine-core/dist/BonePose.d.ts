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
import { Inherit } from "./BoneData.js";
import type { Physics } from "./Physics.js";
import type { Pose } from "./Pose.js";
import type { Skeleton } from "./Skeleton.js";
import type { Update } from "./Update.js";
import { type Vector2 } from "./Utils.js";
/** The applied local pose and world transform for a bone. This is the {@link Bone.getPose} with constraints applied and the
 * world transform computed by {@link Skeleton.updateWorldTransform} and {@link updateWorldTransform}.
 *
 * If the world transform is changed, call {@link updateLocalTransform} before using the local transform. The local
 * transform may be needed by other code (eg to apply another constraint).
 *
 * After changing the world transform, call {@link updateWorldTransform} on every descendant bone. It may be more
 * convenient to modify the local transform instead, then call {@link Skeleton.updateWorldTransform} to update the world
 * transforms for all bones and apply constraints. */
export declare class BonePose implements Pose<BonePose>, Update {
    bone: Bone;
    /** The local x translation. */
    x: number;
    /** The local y translation. */
    y: number;
    /** The local rotation in degrees, counter clockwise. */
    rotation: number;
    /** The local scaleX. */
    scaleX: number;
    /** The local scaleY. */
    scaleY: number;
    /** The local shearX. */
    shearX: number;
    /** The local shearY. */
    shearY: number;
    inherit: Inherit;
    /** The world transform `[a b][c d]` x-axis x component. */
    a: number;
    /** The world transform `[a b][c d]` y-axis x component. */
    b: number;
    /** The world transform `[a b][c d]` x-axis y component. */
    c: number;
    /** The world transform `[a b][c d]` y-axis y component. */
    d: number;
    /** The world X position. If changed, {@link updateLocalTransform} should be called. */
    worldY: number;
    /** The world Y position. If changed, {@link updateLocalTransform} should be called. */
    worldX: number;
    world: number;
    local: number;
    set(pose: BonePose): void;
    setPosition(x: number, y: number): void;
    setScale(scaleX: number, scaleY: number): void;
    setScale(scale: number): void;
    /** Determines how parent world transforms affect this bone. */
    getInherit(): Inherit;
    setInherit(inherit: Inherit): void;
    /** Called by {@link Skeleton.updateCache} to compute the world transform, if needed. */
    update(skeleton: Skeleton, physics: Physics): void;
    /** Computes the world transform using the parent bone's world transform and this applied local pose. Child bones are not
     * updated.
     *
     * See <a href="https://esotericsoftware.com/spine-runtime-skeletons#World-transforms">World transforms</a> in the Spine
     * Runtimes Guide. */
    updateWorldTransform(skeleton: Skeleton): void;
    /** Computes the local transform values from the world transform.
     *
     * If the world transform is modified (by a constraint, {@link rotateWorld}, etc) then this method should be called so
     * the local transform matches the world transform. The local transform may be needed by other code (eg to apply another
     * constraint).
     *
     * Some information is ambiguous in the world transform, such as -1,-1 scale versus 180 rotation. The local transform after
     * calling this method is equivalent to the local transform used to compute the world transform, but may not be identical. */
    updateLocalTransform(skeleton: Skeleton): void;
    private set4;
    private set5;
    /** If the world transform has been modified by constraints and the local transform no longer matches,
     * {@link updateLocalTransform} is called. Call this after {@link Skeleton.updateWorldTransform} before
     * using the applied local transform. */
    validateLocalTransform(skeleton: Skeleton): void;
    modifyLocal(skeleton: Skeleton): void;
    modifyWorld(skeleton: Skeleton): void;
    private resetWorld;
    /** The world rotation for the X axis, calculated using {@link a} and {@link c}. This is the direction the bone is
     * pointing. */
    getWorldRotationX(): number;
    /** The world rotation for the Y axis, calculated using {@link b} and {@link d}. */
    getWorldRotationY(): number;
    /** The magnitude (always positive) of the world scale X, calculated using {@link a} and {@link c}. */
    getWorldScaleX(): number;
    /** The magnitude (always positive) of the world scale Y, calculated using {@link b} and {@link d}. */
    getWorldScaleY(): number;
    /** Transforms a point from world coordinates to the bone's local coordinates. */
    worldToLocal(world: Vector2): Vector2;
    /** Transforms a point from the bone's local coordinates to world coordinates. */
    localToWorld(local: Vector2): Vector2;
    /** Transforms a point from world coordinates to the parent bone's local coordinates. */
    worldToParent(world: Vector2): Vector2;
    /** Transforms a point from the parent bone's coordinates to world coordinates. */
    parentToWorld(world: Vector2): Vector2;
    /** Transforms a world rotation to a local rotation. */
    worldToLocalRotation(worldRotation: number): number;
    /** Transforms a local rotation to a world rotation. */
    localToWorldRotation(localRotation: number): number;
    /** Rotates the world transform the specified amount. */
    rotateWorld(degrees: number): void;
}
