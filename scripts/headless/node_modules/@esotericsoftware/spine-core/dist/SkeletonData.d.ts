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
import type { Animation } from "./Animation.js";
import type { BoneData } from "./BoneData.js";
import type { ConstraintData } from "./ConstraintData.js";
import type { EventData } from "./EventData.js";
import type { Skin } from "./Skin.js";
import type { SlotData } from "./SlotData.js";
/** Stores the setup pose and all of the stateless data for a skeleton.
 *
 * See [Data objects](http://esotericsoftware.com/spine-runtime-architecture#Data-objects) in the Spine Runtimes
 * Guide. */
export declare class SkeletonData {
    /** The skeleton's name, which by default is the name of the skeleton data file, if possible. May be null. */
    name: string | null;
    /** The skeleton's bones, sorted parent first. The root bone is always the first bone. */
    bones: BoneData[];
    /** The skeleton's slots in the setup pose draw order. */
    slots: SlotData[];
    skins: Skin[];
    /** The skeleton's default skin. By default this skin contains all attachments that were not in a skin in Spine.
     *
     * See {@link Skeleton.getAttachmentByName}.
     * May be null. */
    defaultSkin: Skin | null;
    /** The skeleton's events. */
    events: EventData[];
    /** The skeleton's animations. */
    animations: Animation[];
    /** The skeleton's IK constraints. */
    constraints: ConstraintData<any, any>[];
    /** The X coordinate of the skeleton's axis aligned bounding box in the setup pose. */
    x: number;
    /** The Y coordinate of the skeleton's axis aligned bounding box in the setup pose. */
    y: number;
    /** The width of the skeleton's axis aligned bounding box in the setup pose. */
    width: number;
    /** The height of the skeleton's axis aligned bounding box in the setup pose. */
    height: number;
    /** Baseline scale factor for applying distance-dependent effects on non-scalable properties, such as angle or scale. Default
     * is 100. */
    referenceScale: number;
    /** The Spine version used to export the skeleton data, or null. */
    version: string | null;
    /** The skeleton data hash. This value will change if any of the skeleton data has changed. May be null. */
    hash: string | null;
    /** The dopesheet FPS in Spine. Available only when nonessential data was exported. */
    fps: number;
    /** The path to the images folder as defined in Spine. Available only when nonessential data was exported. May be null. */
    imagesPath: string | null;
    /** The path to the audio folder as defined in Spine. Available only when nonessential data was exported. May be null. */
    audioPath: string | null;
    /** Finds a bone by comparing each bone's name. It is more efficient to cache the results of this method than to call it
     * multiple times.
     * @returns May be null. */
    findBone(boneName: string): BoneData | null;
    /** Finds a slot by comparing each slot's name. It is more efficient to cache the results of this method than to call it
     * multiple times.
     * @returns May be null. */
    findSlot(slotName: string): SlotData | null;
    /** Finds a skin by comparing each skin's name. It is more efficient to cache the results of this method than to call it
     * multiple times.
     * @returns May be null. */
    findSkin(skinName: string): Skin | null;
    /** Finds an event by comparing each events's name. It is more efficient to cache the results of this method than to call it
     * multiple times.
     * @returns May be null. */
    findEvent(eventDataName: string): EventData | null;
    /** Collects animations used by {@link SliderData slider constraints}.
     *
     * Slider animations are designed to be applied by slider constraints rather than on their own. Applications that have a user
     * choose an animation may want to exclude them. */
    findSliderAnimations(animations: Animation[]): Animation[];
    /** Finds an animation by comparing each animation's name. It is more efficient to cache the results of this method than to
     * call it multiple times.
     * @returns May be null. */
    findAnimation(animationName: string): Animation | null;
    /** Finds a constraint of the specified type by comparing each constraints's name. It is more efficient to cache the results of
      * this method than to call it multiple times. */
    findConstraint<T extends ConstraintData<any, any>>(constraintName: string, type: abstract new (...args: any[]) => T): T | null;
}
