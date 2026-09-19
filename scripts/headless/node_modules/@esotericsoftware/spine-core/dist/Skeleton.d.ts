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
import type { Attachment } from "./attachments/Attachment.js";
import { Bone } from "./Bone.js";
import type { Constraint } from "./Constraint.js";
import { DrawOrder } from "./DrawOrder.js";
import type { Physics } from "./Physics.js";
import { PhysicsConstraint } from "./PhysicsConstraint.js";
import type { Posed } from "./Posed.js";
import type { SkeletonClipping } from "./SkeletonClipping.js";
import type { SkeletonData } from "./SkeletonData.js";
import type { Skin } from "./Skin.js";
import { Slot } from "./Slot.js";
import { Color, Vector2 } from "./Utils.js";
/** Stores bones and slots to be posed by animations and application code. Multiple skeleton instances can share the same
 * {@link SkeletonData}, including animations, attachments, and skins.
 *
 * After posing, call {@link updateWorldTransform} to apply constraints and compute world transforms for rendering.
 *
 * See [Instance objects](http://esotericsoftware.com/spine-runtime-architecture#Instance-objects) in the Spine Runtimes Guide. */
export declare class Skeleton {
    private static quadTriangles;
    static yDown: boolean;
    static get yDir(): number;
    /** The skeleton's setup pose data. */
    readonly data: SkeletonData;
    /** The skeleton's bones, sorted parent first. The root bone is always the first bone. */
    readonly bones: Array<Bone>;
    /** The skeleton's slots. To add a slot, also add it to {@link DrawOrder.pose}. */
    readonly slots: Array<Slot>;
    /** The skeleton's draw order. Use {@link DrawOrder.appliedPose} for rendering and {@link DrawOrder.pose} for changing the draw
     * order. */
    readonly drawOrder: DrawOrder;
    /** The skeleton's constraints. */
    readonly constraints: Array<Constraint<any, any, any>>;
    /** The skeleton's physics constraints. */
    readonly physics: Array<PhysicsConstraint>;
    /** The list of bones and constraints, sorted in the order they should be updated, as computed by {@link updateCache}. */
    readonly _updateCache: any[];
    readonly resetCache: Array<Posed<any, any>>;
    /** The skeleton's current skin. May be null. */
    skin: Skin | null;
    /** The color to tint all the skeleton's attachments. */
    readonly color: Color;
    /** Scales the entire skeleton on the X axis.
     *
     * Bones that do not inherit scale are still affected by this property. */
    scaleX: number;
    private _scaleY;
    /** Scales the entire skeleton on the Y axis.
     *
     * Bones that do not inherit scale are still affected by this property. */
    get scaleY(): number;
    set scaleY(scaleY: number);
    /** Sets the skeleton X position, which is added to the root bone worldX position.
     *
     * Bones that do not inherit translation are still affected by this property. */
    x: number;
    /** Sets the skeleton Y position, which is added to the root bone worldY position.
     *
     * Bones that do not inherit translation are still affected by this property. */
    y: number;
    /** Returns the skeleton's time, is used for time-based manipulations, such as {@link PhysicsConstraint}.
     *
     * See {@link _update}. */
    time: number;
    /** The x component of a vector that defines the direction {@link PhysicsConstraintPose.wind} is applied. */
    windX: number;
    /** The y component of a vector that defines the direction {@link PhysicsConstraintPose.wind} is applied. */
    windY: number;
    /** The x component of a vector that defines the direction {@link PhysicsConstraintPose.gravity} is applied. */
    gravityX: number;
    /** The y component of a vector that defines the direction {@link PhysicsConstraintPose.gravity} is applied. */
    gravityY: number;
    _update: number;
    constructor(data: SkeletonData);
    /** Caches information about bones and constraints. Must be called if the {@link skin} is modified or if bones, constraints,
     * or weighted path attachments are added or removed. */
    updateCache(): void;
    constrained(object: Posed<any, any>): void;
    sortBone(bone: Bone): void;
    sortReset(bones: Array<Bone>): void;
    /** Updates the world transform for each bone and applies all constraints.
     *
     * See <a href="https://esotericsoftware.com/spine-runtime-skeletons#World-transforms">World transforms</a> in the Spine
     * Runtimes Guide. */
    updateWorldTransform(physics: Physics): void;
    /** Sets the bones, constraints, and slots to their setup pose values. */
    setupPose(): void;
    /** Sets the bones and constraints to their setup pose values. */
    setupPoseBones(): void;
    /** Sets the slots and draw order to their setup pose values. */
    setupPoseSlots(): void;
    /** Returns the root bone, or null if the skeleton has no bones. */
    getRootBone(): Bone | null;
    /** Finds a bone by comparing each bone's name. It is more efficient to cache the results of this method than to call it
     * repeatedly. */
    findBone(boneName: string): Bone | null;
    /** Finds a slot by comparing each slot's name. It is more efficient to cache the results of this method than to call it
     * repeatedly. */
    findSlot(slotName: string): Slot | null;
    /** Sets a skin by name.
     *
     * See {@link setSkin}. */
    setSkin(skinName: string): void;
    /** Sets the skin used to look up attachments before looking in {@link SkeletonData.defaultSkin}. If the skin is changed,
     * {@link updateCache} is called.
     *
     * Attachments from the new skin are attached if the corresponding attachment from the old skin was attached. If there was no
     * old skin, each slot's setup mode attachment is attached from the new skin.
     *
     * After changing the skin, the visible attachments can be reset to those attached in the setup pose by calling
     * {@link setupPoseSlots}. Also, often {@link AnimationState.apply} is called before the next time the skeleton is
     * rendered to allow any attachment keys in the current animation(s) to hide or show attachments from the new skin. */
    setSkin(newSkin: Skin | null): void;
    private setSkinByName;
    private setSkinBySkin;
    /** Finds an attachment by looking in the {@link skin} and {@link SkeletonData.defaultSkin} using the slot name and attachment
     * name.
     *
     * See {@link getAttachment}. */
    getAttachment(slotName: string, placeholder: string): Attachment | null;
    /** Finds an attachment by looking in the {@link skin} and {@link SkeletonData.defaultSkin} using the slot index and
     * attachment name. First the skin is checked and if the attachment was not found, the default skin is checked.
     *
     * See <a href="https://esotericsoftware.com/spine-runtime-skins">Runtime skins</a> in the Spine Runtimes Guide. */
    getAttachment(slotIndex: number, placeholder: string): Attachment | null;
    /** Finds an attachment by looking in the {@link skin} and {@link SkeletonData.defaultSkin} using the slot name and attachment
     * name.
     *
     * See {@link getAttachment}.
     * @returns May be null. */
    private getAttachmentByName;
    /** Finds an attachment by looking in the {@link skin} and {@link SkeletonData.defaultSkin} using the slot index and
     * attachment name. First the skin is checked and if the attachment was not found, the default skin is checked.
     *
     * See [Runtime skins](http://esotericsoftware.com/spine-runtime-skins) in the Spine Runtimes Guide.
     * @returns May be null. */
    private getAttachmentByIndex;
    /** A convenience method to set an attachment by finding the slot with {@link findSlot}, finding the attachment with
     * {@link getAttachment}, then setting the slot's {@link Slot.attachment}.
     * @param placeholder May be null to clear the slot's attachment. */
    setAttachment(slotName: string, placeholder: string | null): void;
    /** Finds a constraint of the specified type by comparing each constraints's name. It is more efficient to cache the results of
     * this method than to call it multiple times. */
    findConstraint<T extends Constraint<any, any, any>>(constraintName: string, type: abstract new (...args: any[]) => T): T | null;
    /** Returns the axis aligned bounding box (AABB) of the region and mesh attachments for the applied pose.
     * @param offset An output value, the distance from the skeleton origin to the bottom left corner of the AABB.
     * @param size An output value, the width and height of the AABB.
     * @param temp Working memory to temporarily store attachments' computed world vertices. */
    getBoundsRect(clipper?: SkeletonClipping): {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    /** Returns the axis aligned bounding box (AABB) of the region and mesh attachments for the applied pose. Optionally applies
     * clipping.
     * @param offset An output value, the distance from the skeleton origin to the bottom left corner of the AABB.
     * @param size An output value, the width and height of the AABB.
     * @param temp Working memory to temporarily store attachments' computed world vertices.
     * @param clipper {@link SkeletonClipping} to use. If `null`, no clipping is applied. */
    getBounds(offset: Vector2, size: Vector2, temp?: Array<number>, clipper?: SkeletonClipping | null): void;
    /** Scales the entire skeleton on the X and Y axes.
     *
     * Bones that do not inherit scale are still affected by this property. */
    setScale(scaleX: number, scaleY: number): void;
    /** Sets the skeleton X and Y position, which is added to the root bone worldX and worldY position.
     *
     * Bones that do not inherit translation are still affected by this property. */
    setPosition(x: number, y: number): void;
    /** Increments the skeleton's {@link time}. */
    update(delta: number): void;
    /** Calls {@link PhysicsConstraint.translate} for each physics constraint. */
    physicsTranslate(x: number, y: number): void;
    /** Calls {@link PhysicsConstraint.rotate} for each physics constraint. */
    physicsRotate(x: number, y: number, degrees: number): void;
}
