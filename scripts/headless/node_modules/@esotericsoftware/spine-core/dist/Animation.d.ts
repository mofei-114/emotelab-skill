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
import type { Attachment, VertexAttachment } from "./attachments/Attachment.js";
import { SequenceMode } from "./attachments/Sequence.js";
import type { Inherit } from "./BoneData.js";
import type { BonePose } from "./BonePose.js";
import type { Event } from "./Event.js";
import type { PhysicsConstraintData } from "./PhysicsConstraintData.js";
import type { PhysicsConstraintPose } from "./PhysicsConstraintPose.js";
import type { Skeleton } from "./Skeleton.js";
import type { Slot } from "./Slot.js";
import type { SlotPose } from "./SlotPose.js";
import { Color, type NumberArrayLike, StringSet } from "./Utils.js";
/** Stores a list of timelines to animate a skeleton's pose over time.
 *
 * See <a href='https://esotericsoftware.com/spine-applying-animations#Timeline-API'>Applying Animations</a> in the Spine Runtimes
 * Guide. */
export declare class Animation {
    /** The animation's name, unique across all animations in the skeleton.
     *
     * See {@link SkeletonData.findAnimation}. */
    readonly name: string;
    /** The duration of the animation in seconds, which is usually the highest time of all frames in the timelines. The duration is
     * used to know when the animation has completed and, for animations that repeat, when it should loop back to the start. */
    timelines: Array<Timeline>;
    readonly timelineIds: StringSet;
    /** {@link Skeleton.getBones} indices that this animation's timelines modify.
     *
     * See {@link BoneTimeline.bones}. */
    readonly bones: Array<number>;
    /** The color of the animation as it was in Spine, or a default color if nonessential data was not exported. */
    readonly color: Color;
    /** The duration of the animation in seconds, which is usually the highest time of all frames in the timeline. The duration is
     * used to know when it has completed and when it should loop back to the start. */
    duration: number;
    constructor(name: string, timelines: Array<Timeline>, duration: number);
    setTimelines(timelines: Array<Timeline>): void;
    /** Returns true if this animation contains a timeline with any of the specified property IDs.
     *
     * See {@link Timeline.propertyIds}. */
    hasTimeline(ids: string[]): boolean;
    /** Applies the animation's timelines to the specified skeleton.
     *
     * See {@link Timeline.apply} and
     * <a href='https://esotericsoftware.com/spine-applying-animations#Timeline-API'>Applying Animations</a> in the Spine Runtimes
     * Guide.
     * @param skeleton The skeleton the animation is applied to. This provides access to the bones, slots, and other skeleton
     *           components the timelines may change.
     * @param lastTime The last time in seconds this animation was applied. Some timelines trigger only at discrete times, in which
     *           case all keys are triggered between `lastTime` (exclusive) and `time` (inclusive). Pass -1
     *           the first time an animation is applied to ensure frame 0 is triggered.
     * @param time The time in seconds the skeleton is being posed for. Timelines find the frame before and after this time and
     *           interpolate between the frame values.
     * @param loop True if `time` beyond the {@link duration} repeats the animation, else the last frame is used.
     * @param events If any events are fired, they are added to this list. Pass null to ignore fired events or if no timelines fire
     *           events.
     * @param alpha 0 applies setup or current values (depending on `from`), 1 uses timeline values, and intermediate
     *           values interpolate between them. Adjusting `alpha` over time can mix an animation in or out.
     * @param from Controls how `alpha` and `add` mix from current or setup pose values to timeline values.
     * @param add If true, for timelines that support it, their values are added to the setup or current values (depending on
     *           `from`).
     * @param out True when the animation is mixing out, else it is mixing in. Used by timelines that perform instant transitions.
     * @param appliedPose True to modify {@link Posed.appliedPose}, else {@link Posed.pose} is modified. */
    apply(skeleton: Skeleton, lastTime: number, time: number, loop: boolean, events: Array<Event> | null, alpha: number, from: MixFrom, add: boolean, out: boolean, appliedPose: boolean): void;
}
/** Controls whether `alpha` and `add` mix from current or setup pose values and what happens before the
 * first key.
 *
 * See {@link Timeline.apply}. */
export declare enum MixFrom {
    /** Alpha mixes from the current pose. Before the first key, no change is made. */
    current = 0,
    /** Alpha mixes from the setup pose. Before the first key, the setup pose is used. */
    setup = 1,
    /** Alpha mixes from the current pose. Before the first key, alpha mixes from the current pose to the setup pose. */
    first = 2
}
export declare enum Property {
    rotate = 0,
    x = 1,
    y = 2,
    scaleX = 3,
    scaleY = 4,
    shearX = 5,
    shearY = 6,
    inherit = 7,
    rgb = 8,
    alpha = 9,
    rgb2 = 10,
    attachment = 11,
    deform = 12,
    event = 13,
    drawOrder = 14,
    drawOrderFolder = 15,
    ikConstraint = 16,
    transformConstraint = 17,
    pathConstraintPosition = 18,
    pathConstraintSpacing = 19,
    pathConstraintMix = 20,
    physicsConstraintInertia = 21,
    physicsConstraintStrength = 22,
    physicsConstraintDamping = 23,
    physicsConstraintMass = 24,
    physicsConstraintWind = 25,
    physicsConstraintGravity = 26,
    physicsConstraintMix = 27,
    physicsConstraintReset = 28,
    sequence = 29,
    sliderTime = 30,
    sliderMix = 31
}
/** The base class for all timelines.
 *
 * See <a href='https://esotericsoftware.com/spine-applying-animations#Timeline-API'>Applying Animations</a> in the Spine
 * Runtimes Guide. */
export declare abstract class Timeline {
    readonly propertyIds: string[];
    readonly frames: NumberArrayLike;
    /** True if this timeline supports being applied additively.
     *
     * See the `add` parameter in {@link Timeline.apply}. */
    additive: boolean;
    /** True if this timeline sets values instantaneously and does not support interpolation between frames. */
    instant: boolean;
    constructor(frameCount: number, ...propertyIds: string[]);
    getPropertyIds(): string[];
    /** The number of values stored per frame. */
    getFrameEntries(): number;
    /** The number of frames in this timeline. */
    getFrameCount(): number;
    /** The duration of the timeline in seconds, which is usually the highest time of all frames in the timeline. */
    getDuration(): number;
    /** Applies this timeline to the skeleton.
     *
     * See <a href='https://esotericsoftware.com/spine-applying-animations#Timeline-API'>Applying Animations</a> in the Spine
     * Runtimes Guide.
     * @param skeleton The skeleton the timeline is applied to. This provides access to the bones, slots, and other skeleton
     *           components the timelines may change.
     * @param lastTime The last time in seconds this timeline was applied. Some timelines trigger only at discrete times, in
     *           which case all keys are triggered between `lastTime` (exclusive) and `time` (inclusive).
     *           Pass -1 the first time a timeline is applied to ensure frame 0 is triggered.
     * @param time The time in seconds the skeleton is being posed for. Timelines find the frame before and after this time and
     *           interpolate between the frame values.
     * @param events If any events are fired, they are added to this list. Pass null to ignore fired events or if no timelines
     *           fire events.
     * @param alpha 0 applies setup or current values (depending on `from`), 1 uses timeline values, and intermediate
     *           values interpolate between them. Adjusting `alpha` over time can mix a timeline in or out.
     * @param from Controls how `alpha` and `add` mix from current or setup pose values to timeline
     *           values.
     * @param add If true, for timelines that support it, their values are added to the setup or current values (depending on
     *           `from`).
     * @param out True when the animation is mixing out, else it is mixing in. Used by timelines that perform instant
     *           transitions.
     * @param appliedPose True to modify {@link Posed.appliedPose}, else {@link Posed.pose} is modified. */
    abstract apply(skeleton: Skeleton, lastTime: number, time: number, events: Array<Event> | null, alpha: number, from: MixFrom, add: boolean, out: boolean, appliedPose: boolean): void;
    /** Linear search using the specified stride (default 1).
     * @param time Must be >= the first value in `frames`.
     * @return The index of the first value <= `time`. */
    static search(frames: NumberArrayLike, time: number, step?: number): number;
}
/** An interface for timelines that change a slot's properties. */
export interface SlotTimeline {
    /** The index of the slot in {@link Skeleton.slots} that will be changed when this timeline is applied. */
    slotIndex: number;
}
export declare function isSlotTimeline(obj: Timeline & Partial<SlotTimeline>): obj is Timeline & SlotTimeline;
/** The base class for timelines that interpolate between frame values using stepped, linear, or a Bezier curve. */
export declare abstract class CurveTimeline extends Timeline {
    protected curves: NumberArrayLike;
    constructor(frameCount: number, bezierCount: number, ...propertyIds: string[]);
    /** Sets the specified key frame to linear interpolation. */
    setLinear(frame: number): void;
    /** Sets the specified key frame to stepped interpolation. */
    setStepped(frame: number): void;
    /** Shrinks the storage for Bezier curves, for use when `bezierCount` (specified in the constructor) was larger
     * than the actual number of Bezier curves. */
    shrink(bezierCount: number): void;
    /** Stores the segments for the specified Bezier curve. For timelines that modify multiple values, there may be more than
     * one curve per frame.
     * @param bezier The ordinal of this Bezier curve for this timeline, between 0 and `bezierCount - 1` (specified
     *           in the constructor), inclusive.
     * @param frame Between 0 and `frameCount - 1`, inclusive.
     * @param value The index of the value for this frame that this curve is used for.
     * @param time1 The time for the first key.
     * @param value1 The value for the first key.
     * @param cx1 The time for the first Bezier handle.
     * @param cy1 The value for the first Bezier handle.
     * @param cx2 The time of the second Bezier handle.
     * @param cy2 The value for the second Bezier handle.
     * @param time2 The time for the second key.
     * @param value2 The value for the second key. */
    setBezier(bezier: number, frame: number, value: number, time1: number, value1: number, cx1: number, cy1: number, cx2: number, cy2: number, time2: number, value2: number): void;
    /** Returns the Bezier interpolated value for the specified time.
     * @param frameIndex The index into {@link frames} for the values of the frame before `time`.
     * @param valueOffset The offset from `frameIndex` to the value this curve is used for.
     * @param i The index of the Bezier segments. See {@link getCurveType}. */
    getBezierValue(time: number, frameIndex: number, valueOffset: number, i: number): number;
}
/** The base class for a {@link CurveTimeline} that sets one property with a curve. */
export declare abstract class CurveTimeline1 extends CurveTimeline {
    constructor(frameCount: number, bezierCount: number, propertyId: string);
    getFrameEntries(): number;
    /** Sets the time and value for the specified frame.
     * @param frame Between 0 and `frameCount`, inclusive.
     * @param time The frame time in seconds. */
    setFrame(frame: number, time: number, value: number): void;
    /** Returns the interpolated value for the specified time. */
    getCurveValue(time: number): number;
    /** Returns the interpolated value for properties relative to the setup value. The timeline value is added to the setup
     * value, rather than replacing it.
     *
     * See {@link Timeline.apply}.
     * @param current The current value for the property.
     * @param setup The setup value for the property. */
    getRelativeValue(time: number, alpha: number, from: MixFrom, add: boolean, current: number, setup: number): number;
    /** Returns the interpolated value for properties set as absolute values. The timeline value replaces the setup value,
     * rather than being relative to it.
     *
     * See {@link Timeline.apply}.
     * @param current The current value for the property.
     * @param setup The setup value for the property. */
    getAbsoluteValue(time: number, alpha: number, from: MixFrom, add: boolean, current: number, setup: number): number;
    /** Returns the interpolated value for properties set as absolute values, using the specified timeline value rather than
     * calling {@link getCurveValue}.
     *
     * See {@link Timeline.apply}.
     * @param current The current value for the property.
     * @param setup The setup value for the property.
     * @param value The timeline value to apply. */
    getAbsoluteValue(time: number, alpha: number, from: MixFrom, add: boolean, current: number, setup: number, value: number): number;
    private getAbsoluteValue1;
    private getAbsoluteValue2;
    /** Returns the interpolated value for scale properties. The timeline and setup values are multiplied and sign adjusted.
     *
     * See {@link Timeline.apply}.
     * @param current The current value for the property.
     * @param setup The setup value for the property. */
    getScaleValue(time: number, alpha: number, from: MixFrom, add: boolean, out: boolean, current: number, setup: number): number;
    private static beforeFirstKey;
}
/** An interface for timelines that change a bone's properties. */
export interface BoneTimeline {
    /** The index of the bone in {@link Skeleton.bones} that is changed by this timeline. */
    boneIndex: number;
}
export declare function isBoneTimeline(obj: Timeline & Partial<BoneTimeline>): obj is Timeline & BoneTimeline;
/** The base class for timelines that change 1 bone property with a curve. */
export declare abstract class BoneTimeline1 extends CurveTimeline1 implements BoneTimeline {
    readonly boneIndex: number;
    constructor(frameCount: number, bezierCount: number, boneIndex: number, property: Property);
    apply(skeleton: Skeleton, lastTime: number, time: number, events: Array<Event> | null, alpha: number, from: MixFrom, add: boolean, out: boolean, appliedPose: boolean): void;
    protected abstract apply1(pose: BonePose, setup: BonePose, time: number, alpha: number, from: MixFrom, add: boolean, out: boolean): void;
}
/** The base class for timelines that change two bone properties with a curve. */
export declare abstract class BoneTimeline2 extends CurveTimeline implements BoneTimeline {
    readonly boneIndex: number;
    /** @param bezierCount The maximum number of Bezier curves. See {@link shrink}.
     * @param propertyIds Unique identifiers for the properties the timeline modifies. */
    constructor(frameCount: number, bezierCount: number, boneIndex: number, property1: Property, property2: Property);
    getFrameEntries(): number;
    /** Sets the time and values for the specified frame.
     * @param frame Between 0 and `frameCount`, inclusive.
     * @param time The frame time in seconds. */
    setFrame(frame: number, time: number, value1: number, value2: number): void;
    apply(skeleton: Skeleton, lastTime: number, time: number, events: Array<Event> | null, alpha: number, from: MixFrom, add: boolean, out: boolean, appliedPose: boolean): void;
    protected abstract apply1(pose: BonePose, setup: BonePose, time: number, alpha: number, from: MixFrom, add: boolean, out: boolean): void;
}
/** Changes {@link BonePose.rotation}. */
export declare class RotateTimeline extends BoneTimeline1 {
    constructor(frameCount: number, bezierCount: number, boneIndex: number);
    apply1(pose: BonePose, setup: BonePose, time: number, alpha: number, from: MixFrom, add: boolean, out: boolean): void;
}
/** Changes {@link BonePose.x} and {@link BonePose.y}. */
export declare class TranslateTimeline extends BoneTimeline2 {
    constructor(frameCount: number, bezierCount: number, boneIndex: number);
    apply1(pose: BonePose, setup: BonePose, time: number, alpha: number, from: MixFrom, add: boolean, out: boolean): void;
}
/** Changes {@link BonePose.x}. */
export declare class TranslateXTimeline extends BoneTimeline1 {
    constructor(frameCount: number, bezierCount: number, boneIndex: number);
    protected apply1(pose: BonePose, setup: BonePose, time: number, alpha: number, from: MixFrom, add: boolean, out: boolean): void;
}
/** Changes {@link BonePose.y}. */
export declare class TranslateYTimeline extends BoneTimeline1 {
    constructor(frameCount: number, bezierCount: number, boneIndex: number);
    protected apply1(pose: BonePose, setup: BonePose, time: number, alpha: number, from: MixFrom, add: boolean, out: boolean): void;
}
/** Changes {@link BonePose.scaleX} and {@link BonePose.scaleY}. */
export declare class ScaleTimeline extends BoneTimeline2 {
    constructor(frameCount: number, bezierCount: number, boneIndex: number);
    protected apply1(pose: BonePose, setup: BonePose, time: number, alpha: number, from: MixFrom, add: boolean, out: boolean): void;
}
/** Changes a {@link BonePose.scaleX}. */
export declare class ScaleXTimeline extends BoneTimeline1 {
    constructor(frameCount: number, bezierCount: number, boneIndex: number);
    protected apply1(pose: BonePose, setup: BonePose, time: number, alpha: number, from: MixFrom, add: boolean, out: boolean): void;
}
/** Changes a {@link BonePose.scaleY}. */
export declare class ScaleYTimeline extends BoneTimeline1 {
    constructor(frameCount: number, bezierCount: number, boneIndex: number);
    protected apply1(pose: BonePose, setup: BonePose, time: number, alpha: number, from: MixFrom, add: boolean, out: boolean): void;
}
/** Changes {@link Bone.shearX} and {@link Bone.shearY}. */
export declare class ShearTimeline extends BoneTimeline2 {
    constructor(frameCount: number, bezierCount: number, boneIndex: number);
    protected apply1(pose: BonePose, setup: BonePose, time: number, alpha: number, from: MixFrom, add: boolean, out: boolean): void;
}
/** Changes {@link Bone.shearX} and {@link Bone.shearY}. */
export declare class ShearXTimeline extends BoneTimeline1 {
    constructor(frameCount: number, bezierCount: number, boneIndex: number);
    protected apply1(pose: BonePose, setup: BonePose, time: number, alpha: number, from: MixFrom, add: boolean, out: boolean): void;
}
/** Changes {@link Bone.shearX} and {@link Bone.shearY}. */
export declare class ShearYTimeline extends BoneTimeline1 {
    constructor(frameCount: number, bezierCount: number, boneIndex: number);
    protected apply1(pose: BonePose, setup: BonePose, time: number, alpha: number, from: MixFrom, add: boolean, out: boolean): void;
}
/** Changes {@link BonePose.inherit}. */
export declare class InheritTimeline extends Timeline implements BoneTimeline {
    readonly boneIndex: number;
    constructor(frameCount: number, boneIndex: number);
    getFrameEntries(): number;
    /** Sets the inherit transform mode for the specified frame.
     * @param frame Between 0 and `frameCount`, inclusive.
     * @param time The frame time in seconds. */
    setFrame(frame: number, time: number, inherit: Inherit): void;
    apply(skeleton: Skeleton, lastTime: number, time: number, events: Array<Event>, alpha: number, from: MixFrom, add: boolean, out: boolean, appliedPose: boolean): void;
}
/** The base class for timelines that change any number of slot properties with a curve. */
export declare abstract class SlotCurveTimeline extends CurveTimeline implements SlotTimeline {
    readonly slotIndex: number;
    constructor(frameCount: number, bezierCount: number, slotIndex: number, ...propertyIds: string[]);
    apply(skeleton: Skeleton, lastTime: number, time: number, events: Array<Event>, alpha: number, from: MixFrom, add: boolean, out: boolean, appliedPose: boolean): void;
    protected abstract apply1(slot: Slot, pose: SlotPose, time: number, alpha: number, from: MixFrom, add: boolean): void;
}
/** Changes {@link SlotPose.color}. */
export declare class RGBATimeline extends SlotCurveTimeline {
    constructor(frameCount: number, bezierCount: number, slotIndex: number);
    getFrameEntries(): number;
    /** Sets the time in seconds, red, green, blue, and alpha for the specified key frame. */
    setFrame(frame: number, time: number, r: number, g: number, b: number, a: number): void;
    protected apply1(slot: Slot, pose: SlotPose, time: number, alpha: number, from: MixFrom, add: boolean): void;
}
/** Changes RGB for a slot's {@link SlotPose.color}. */
export declare class RGBTimeline extends SlotCurveTimeline {
    constructor(frameCount: number, bezierCount: number, slotIndex: number);
    getFrameEntries(): number;
    /** Sets the time in seconds, red, green, blue, and alpha for the specified key frame. */
    setFrame(frame: number, time: number, r: number, g: number, b: number): void;
    protected apply1(slot: Slot, pose: SlotPose, time: number, alpha: number, from: MixFrom, add: boolean): void;
}
/** Changes alpha for a slot's {@link SlotPose.color}. */
export declare class AlphaTimeline extends CurveTimeline1 implements SlotTimeline {
    slotIndex: number;
    constructor(frameCount: number, bezierCount: number, slotIndex: number);
    apply(skeleton: Skeleton, lastTime: number, time: number, events: Array<Event>, alpha: number, from: MixFrom, add: boolean, out: boolean, appliedPose: boolean): void;
}
/** Changes {@link SlotPose.color} and {@link SlotPose.darkColor} for two color tinting. */
export declare class RGBA2Timeline extends SlotCurveTimeline {
    constructor(frameCount: number, bezierCount: number, slotIndex: number);
    getFrameEntries(): number;
    /** Sets the time in seconds, light, and dark colors for the specified key frame. */
    setFrame(frame: number, time: number, r: number, g: number, b: number, a: number, r2: number, g2: number, b2: number): void;
    protected apply1(slot: Slot, pose: SlotPose, time: number, alpha: number, from: MixFrom, add: boolean): void;
}
/** Changes {@link SlotPose.color} and {@link SlotPose.darkColor} for two color tinting. */
export declare class RGB2Timeline extends SlotCurveTimeline {
    constructor(frameCount: number, bezierCount: number, slotIndex: number);
    getFrameEntries(): number;
    /** Sets the time in seconds, light, and dark colors for the specified key frame. */
    setFrame(frame: number, time: number, r: number, g: number, b: number, r2: number, g2: number, b2: number): void;
    protected apply1(slot: Slot, pose: SlotPose, time: number, alpha: number, from: MixFrom, add: boolean): void;
}
/** Changes {@link SlotPose.ttachment}. */
export declare class AttachmentTimeline extends Timeline implements SlotTimeline {
    slotIndex: number;
    /** The attachment name for each key frame. May contain null values to clear the attachment. */
    attachmentNames: Array<string | null>;
    constructor(frameCount: number, slotIndex: number);
    getFrameCount(): number;
    /** Sets the time in seconds and the attachment name for the specified key frame. */
    setFrame(frame: number, time: number, attachmentName: string | null): void;
    apply(skeleton: Skeleton, lastTime: number, time: number, events: Array<Event>, alpha: number, from: MixFrom, add: boolean, out: boolean, appliedPose: boolean): void;
    setAttachment(skeleton: Skeleton, pose: SlotPose, attachmentName: string | null): void;
}
/** Changes {@link SlotPose.deform} to deform a {@link VertexAttachment}. */
export declare class DeformTimeline extends CurveTimeline implements SlotTimeline {
    readonly slotIndex: number;
    /** The attachment that will be deformed.
     *
     * See {@link VertexAttachment.getTimelineAttachment}. */
    readonly attachment: VertexAttachment;
    /** The vertices for each key frame. */
    vertices: Array<NumberArrayLike>;
    constructor(frameCount: number, bezierCount: number, slotIndex: number, attachment: VertexAttachment);
    getFrameCount(): number;
    /** Sets the time and vertices for the specified frame.
     * @param frame Between 0 and `frameCount`, inclusive.
     * @param time The frame time in seconds.
     * @param vertices Vertex positions for an unweighted VertexAttachment, or deform offsets if it has weights. */
    setFrame(frame: number, time: number, vertices: NumberArrayLike): void;
    /** @param value1 Ignored (0 is used for a deform timeline).
     * @param value2 Ignored (1 is used for a deform timeline). */
    setBezier(bezier: number, frame: number, value: number, time1: number, value1: number, cx1: number, cy1: number, cx2: number, cy2: number, time2: number, value2: number): void;
    getCurvePercent(time: number, frame: number): number;
    apply(skeleton: Skeleton, lastTime: number, time: number, events: Event[] | null, alpha: number, from: MixFrom, add: boolean, out: boolean, appliedPose: boolean): void;
    private applyBeforeFirst;
    private applyToSlot;
}
/** Changes {@link Slot.getSequenceIndex} for an attachment's {@link Sequence}. */
export declare class SequenceTimeline extends Timeline implements SlotTimeline {
    static ENTRIES: number;
    static MODE: number;
    static DELAY: number;
    readonly slotIndex: number;
    readonly attachment: Attachment;
    constructor(frameCount: number, slotIndex: number, attachment: Attachment);
    getFrameEntries(): number;
    getSlotIndex(): number;
    /** The attachment for which the {@link SlotPose.sequenceIndex} will be set.
     *
     * See {@link VertexAttachment.timelineAttachment}. */
    getAttachment(): Attachment;
    /** Sets the time, mode, index, and frame time for the specified frame.
     * @param frame Between 0 and `frameCount`, inclusive.
     * @param time Seconds between frames. */
    setFrame(frame: number, time: number, mode: SequenceMode, index: number, delay: number): void;
    apply(skeleton: Skeleton, lastTime: number, time: number, events: Array<Event>, alpha: number, from: MixFrom, add: boolean, out: boolean, appliedPose: boolean): void;
    private setupPose;
    private applyToSlot;
}
/** Fires an {@link Event} when specific animation times are reached. */
export declare class EventTimeline extends Timeline {
    static propertyIds: string[];
    /** The event for each key frame. */
    events: Array<Event>;
    constructor(frameCount: number);
    getFrameCount(): number;
    /** Sets the time in seconds and the event for the specified key frame. */
    setFrame(frame: number, event: Event): void;
    /** Fires events for frames > `lastTime` and <= `time`. */
    apply(skeleton: Skeleton | null, lastTime: number, time: number, firedEvents: Array<Event>, alpha: number, from: MixFrom, add: boolean, out: boolean, appliedPose: boolean): void;
}
/** Changes the {@link Skeleton.getDrawOrder}. */
export declare class DrawOrderTimeline extends Timeline {
    static readonly propertyID = "14";
    static propertyIds: string[];
    /** The draw order for each key frame. See {@link setFrame}. */
    private readonly drawOrders;
    constructor(frameCount: number);
    getFrameCount(): number;
    /** Sets the time in seconds and the draw order for the specified key frame.
     * @param drawOrder Ordered {@link Skeleton.slots} indices, or null to use setup pose
     *           draw order. */
    setFrame(frame: number, time: number, drawOrder: Array<number> | null): void;
    apply(skeleton: Skeleton, lastTime: number, time: number, firedEvents: Array<Event>, alpha: number, from: MixFrom, add: boolean, out: boolean, appliedPose: boolean): void;
}
/** Changes a subset of the {@link Skeleton.getDrawOrder | draw order}. */
export declare class DrawOrderFolderTimeline extends Timeline {
    static readonly propertyID = "15";
    private readonly slots;
    private readonly inFolder;
    private readonly drawOrders;
    /** @param slots {@link Skeleton.slots} indices controlled by this timeline, in setup order.
     * @param slotCount The maximum number of slots in the skeleton. */
    constructor(frameCount: number, slots: number[], slotCount: number);
    private static propertyIds;
    getFrameCount(): number;
    /** The {@link Skeleton.getSlots} indices that this timeline affects, in setup order. */
    getSlots(): number[];
    /** The draw order for each frame. See {@link setFrame}. */
    getDrawOrders(): Array<Array<number> | null>;
    /** Sets the time and draw order for the specified frame.
     * @param frame Between 0 and `frameCount`, inclusive.
     * @param time The frame time in seconds.
     * @param drawOrder Ordered {@link getSlots} indices, or null to use setup pose order. */
    setFrame(frame: number, time: number, drawOrder: Array<number> | null): void;
    apply(skeleton: Skeleton, lastTime: number, time: number, events: Array<Event>, alpha: number, from: MixFrom, add: boolean, out: boolean, appliedPose: boolean): void;
    private setup;
}
export interface ConstraintTimeline {
    /** The index of the constraint in {@link Skeleton.constraints} that will be changed when this timeline is applied, or -1 if
     * a specific constraint will not be changed. */
    readonly constraintIndex: number;
}
export declare function isConstraintTimeline(obj: Timeline & Partial<ConstraintTimeline>): obj is Timeline & ConstraintTimeline;
/** Changes {@link IkConstraintPose.mix)}, {@link IkConstraintPose.softness},
 * {@link IkConstraintPose.bendDirection}, {@link IkConstraintPose.stretch}, and
 * {@link IkConstraintPose.compress}. */
export declare class IkConstraintTimeline extends CurveTimeline implements ConstraintTimeline {
    readonly constraintIndex: number;
    constructor(frameCount: number, bezierCount: number, constraintIndex: number);
    getFrameEntries(): number;
    /** Sets the time, mix, softness, bend direction, compress, and stretch for the specified frame.
     * @param frame Between 0 and `frameCount`, inclusive.
     * @param time The frame time in seconds.
     * @param bendDirection 1 or -1. */
    setFrame(frame: number, time: number, mix: number, softness: number, bendDirection: number, compress: boolean, stretch: boolean): void;
    apply(skeleton: Skeleton, lastTime: number, time: number, firedEvents: Array<Event>, alpha: number, from: MixFrom, add: boolean, out: boolean, appliedPose: boolean): void;
}
/** Changes {@link TransformConstraintPose.mixRotate}, {@link TransformConstraintPose.mixX},
 * {@link TransformConstraintPose.mixY}, {@link TransformConstraintPose.mixScaleX},
 * {@link TransformConstraintPose.mixScaleY}, and {@link TransformConstraintPose.mixShearY}. */
export declare class TransformConstraintTimeline extends CurveTimeline implements ConstraintTimeline {
    /** The index of the transform constraint slot in {@link Skeleton.transformConstraints} that will be changed. */
    constraintIndex: number;
    constructor(frameCount: number, bezierCount: number, constraintIndex: number);
    getFrameEntries(): number;
    /** Sets the time, rotate mix, translate mix, scale mix, and shear mix for the specified frame.
     * @param frame Between 0 and `frameCount`, inclusive.
     * @param time The frame time in seconds. */
    setFrame(frame: number, time: number, mixRotate: number, mixX: number, mixY: number, mixScaleX: number, mixScaleY: number, mixShearY: number): void;
    apply(skeleton: Skeleton, lastTime: number, time: number, firedEvents: Array<Event>, alpha: number, from: MixFrom, add: boolean, out: boolean, appliedPose: boolean): void;
}
/** The base class for timelines that change 1 constraint property with a curve. */
export declare abstract class ConstraintTimeline1 extends CurveTimeline1 implements ConstraintTimeline {
    readonly constraintIndex: number;
    constructor(frameCount: number, bezierCount: number, constraintIndex: number, property: Property);
}
/** Changes {@link PathConstraintPose.position}. */
export declare class PathConstraintPositionTimeline extends ConstraintTimeline1 {
    constructor(frameCount: number, bezierCount: number, constraintIndex: number);
    apply(skeleton: Skeleton, lastTime: number, time: number, firedEvents: Array<Event>, alpha: number, from: MixFrom, add: boolean, out: boolean, appliedPose: boolean): void;
}
/** Changes {@link PathConstraintPose.spacing}. */
export declare class PathConstraintSpacingTimeline extends ConstraintTimeline1 {
    constructor(frameCount: number, bezierCount: number, constraintIndex: number);
    apply(skeleton: Skeleton, lastTime: number, time: number, firedEvents: Array<Event>, alpha: number, from: MixFrom, add: boolean, out: boolean, appliedPose: boolean): void;
}
/** Changes {@link PathConstraint.mixRotate}, {@link PathConstraint.mixX}, and
 * {@link PathConstraint.mixY}. */
export declare class PathConstraintMixTimeline extends CurveTimeline implements ConstraintTimeline {
    readonly constraintIndex: number;
    constructor(frameCount: number, bezierCount: number, constraintIndex: number);
    getFrameEntries(): number;
    /** Sets the time and color for the specified frame.
     * @param frame Between 0 and `frameCount`, inclusive.
     * @param time The frame time in seconds. */
    setFrame(frame: number, time: number, mixRotate: number, mixX: number, mixY: number): void;
    apply(skeleton: Skeleton, lastTime: number, time: number, firedEvents: Array<Event>, alpha: number, from: MixFrom, add: boolean, out: boolean, appliedPose: boolean): void;
}
/** The base class for most {@link PhysicsConstraint} timelines. */
export declare abstract class PhysicsConstraintTimeline extends ConstraintTimeline1 {
    /** @param constraintIndex -1 for all physics constraints in the skeleton. */
    constructor(frameCount: number, bezierCount: number, constraintIndex: number, property: number);
    apply(skeleton: Skeleton, lastTime: number, time: number, firedEvents: Array<Event>, alpha: number, from: MixFrom, add: boolean, out: boolean, appliedPose: boolean): void;
    abstract get(pose: PhysicsConstraintPose): number;
    abstract set(pose: PhysicsConstraintPose, value: number): void;
    abstract global(constraint: PhysicsConstraintData): boolean;
}
/** Changes {@link PhysicsConstraintPose.inertia}. */
export declare class PhysicsConstraintInertiaTimeline extends PhysicsConstraintTimeline {
    constructor(frameCount: number, bezierCount: number, constraintIndex: number);
    get(pose: PhysicsConstraintPose): number;
    set(pose: PhysicsConstraintPose, value: number): void;
    global(constraint: PhysicsConstraintData): boolean;
}
/** Changes {@link PhysicsConstraintPose.strength}. */
export declare class PhysicsConstraintStrengthTimeline extends PhysicsConstraintTimeline {
    constructor(frameCount: number, bezierCount: number, constraintIndex: number);
    get(pose: PhysicsConstraintPose): number;
    set(pose: PhysicsConstraintPose, value: number): void;
    global(constraint: PhysicsConstraintData): boolean;
}
/** Changes {@link PhysicsConstraintPose.damping}. */
export declare class PhysicsConstraintDampingTimeline extends PhysicsConstraintTimeline {
    constructor(frameCount: number, bezierCount: number, constraintIndex: number);
    get(pose: PhysicsConstraintPose): number;
    set(pose: PhysicsConstraintPose, value: number): void;
    global(constraint: PhysicsConstraintData): boolean;
}
/** Changes {@link PhysicsConstraintPose.massInverse}. The timeline values are not inverted. */
export declare class PhysicsConstraintMassTimeline extends PhysicsConstraintTimeline {
    constructor(frameCount: number, bezierCount: number, constraintIndex: number);
    get(pose: PhysicsConstraintPose): number;
    set(pose: PhysicsConstraintPose, value: number): void;
    global(constraint: PhysicsConstraintData): boolean;
}
/** Changes {@link PhysicsConstraintPose.wind}. */
export declare class PhysicsConstraintWindTimeline extends PhysicsConstraintTimeline {
    constructor(frameCount: number, bezierCount: number, constraintIndex: number);
    get(pose: PhysicsConstraintPose): number;
    set(pose: PhysicsConstraintPose, value: number): void;
    global(constraint: PhysicsConstraintData): boolean;
}
/** Changes {@link PhysicsConstraintPose.gravity}. */
export declare class PhysicsConstraintGravityTimeline extends PhysicsConstraintTimeline {
    constructor(frameCount: number, bezierCount: number, constraintIndex: number);
    get(pose: PhysicsConstraintPose): number;
    set(pose: PhysicsConstraintPose, value: number): void;
    global(constraint: PhysicsConstraintData): boolean;
}
/** Changes {@link PhysicsConstraintPose.mix}. */
export declare class PhysicsConstraintMixTimeline extends PhysicsConstraintTimeline {
    constructor(frameCount: number, bezierCount: number, constraintIndex: number);
    get(pose: PhysicsConstraintPose): number;
    set(pose: PhysicsConstraintPose, value: number): void;
    global(constraint: PhysicsConstraintData): boolean;
}
/** Resets a physics constraint when specific animation times are reached. */
export declare class PhysicsConstraintResetTimeline extends Timeline implements ConstraintTimeline {
    private static propertyIds;
    /** The index of the physics constraint in {@link Skeleton.contraints} that will be reset when this timeline is
    * applied, or -1 if all physics constraints in the skeleton will be reset. */
    readonly constraintIndex: number;
    /** @param constraintIndex -1 for all physics constraints in the skeleton. */
    constructor(frameCount: number, constraintIndex: number);
    getFrameCount(): number;
    /** Sets the time for the specified frame.
     * @param frame Between 0 and `frameCount`, inclusive. */
    setFrame(frame: number, time: number): void;
    /** Resets the physics constraint when frames > `lastTime` and <= `time`. */
    apply(skeleton: Skeleton, lastTime: number, time: number, firedEvents: Array<Event>, alpha: number, from: MixFrom, add: boolean, out: boolean, appliedPose: boolean): void;
}
/** Changes {@link SliderPose.time}. */
export declare class SliderTimeline extends ConstraintTimeline1 {
    constructor(frameCount: number, bezierCount: number, constraintIndex: number);
    apply(skeleton: Skeleton, lastTime: number, time: number, firedEvents: Array<Event>, alpha: number, from: MixFrom, add: boolean, out: boolean, appliedPose: boolean): void;
}
/** Changes {@link SliderPose.mix}. */
export declare class SliderMixTimeline extends ConstraintTimeline1 {
    constructor(frameCount: number, bezierCount: number, constraintIndex: number);
    apply(skeleton: Skeleton, lastTime: number, time: number, firedEvents: Array<Event>, alpha: number, from: MixFrom, add: boolean, out: boolean, appliedPose: boolean): void;
}
