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
import type { Skeleton } from "../Skeleton.js";
import type { Slot } from "../Slot.js";
import { type NumberArrayLike } from "../Utils.js";
/** The base class for all attachments. Multiple {@link Skeleton} instances, slots, or skins can use the same attachments. */
export declare abstract class Attachment {
    private static readonly empty;
    name: string;
    /** Timelines for the timeline attachment are also applied to this attachment.
     * @return May be null if no attachment-specific timelines should be applied. */
    timelineAttachment?: Attachment;
    /** Slots that can have attachments whose {@link timelineAttachment} is this attachment. */
    timelineSlots: number[];
    constructor(name: string);
    abstract copy(): Attachment;
    /** Returns true if the {@code slotIndex} or any {@link timelineSlots} have an attachment whose {@link timelineAttachment} is
     * this attachment.
     * @param slots The {@link Skeleton.slots}.
     * @param slotIndex The timeline's primary slot index. */
    isTimelineActive(slots: Slot[], slotIndex: number, appliedPose: boolean): boolean;
}
/** Base class for an attachment with vertices that are transformed by one or more bones and can be deformed by
 * {@link SlotPose.deform}. */
export declare abstract class VertexAttachment extends Attachment {
    private static nextID;
    /** The unique ID for this attachment. */
    id: number;
    /** The bones that affect the {@link vertices}. The entries are, for each vertex, the number of bones affecting the vertex
     * followed by that many bone indices, which is {@link Skeleton.getBones} index. Null if this attachment has no weights. */
    bones: Array<number> | null;
    /** The vertex positions in the bone's coordinate system. For a non-weighted attachment, the values are `x,y`
     * entries for each vertex. For a weighted attachment, the values are `x,y,weight` triplets for each bone affecting
     * each vertex. */
    vertices: NumberArrayLike;
    /** The maximum number of world vertex values that can be output by
     * {@link computeWorldVertices} using the `count` parameter. */
    worldVerticesLength: number;
    constructor(name: string);
    /** Transforms the attachment's local {@link vertices} to world coordinates. If {@link SlotPose.getDeform} is not empty, it
     * is used to deform the vertices.
     *
     * See <a href="https://esotericsoftware.com/spine-runtime-skeletons#World-transforms">World transforms</a> in the Spine
     * Runtimes Guide.
     * @param start The index of the first {@link vertices} value to transform. Each vertex has 2 values, x and y.
     * @param count The number of world vertex values to output. Must be <= {@link worldVerticesLength} - `start`.
     * @param worldVertices The output world vertices. Must have a length >= `offset` + `count` *
     *           `stride` / 2.
     * @param offset The `worldVertices` index to begin writing values.
     * @param stride The number of `worldVertices` entries between the value pairs written. */
    computeWorldVertices(skeleton: Skeleton, slot: Slot, start: number, count: number, worldVertices: NumberArrayLike, offset: number, stride: number): void;
    /** Does not copy id (generated) or name (set on construction). **/
    copyTo(attachment: VertexAttachment): void;
}
