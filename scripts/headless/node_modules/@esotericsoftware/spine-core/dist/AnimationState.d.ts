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
/** biome-ignore-all lint/style/noNonNullAssertion: reference runtime expects some nullable to not be null */
import { Animation, AttachmentTimeline, MixFrom, RotateTimeline } from "./Animation.js";
import type { AnimationStateData } from "./AnimationStateData.js";
import type { Event } from "./Event.js";
import type { Skeleton } from "./Skeleton.js";
import { Interpolation, Pool } from "./Utils.js";
/** Applies animations over time, queues animations for later playback, mixes (crossfading) between animations, and applies
 * multiple animations on top of each other (layering).
 *
 * See [Applying Animations](http://esotericsoftware.com/spine-applying-animations#AnimationState-API) in the Spine Runtimes Guide. */
export declare class AnimationState {
    static readonly emptyAnimation: Animation;
    /** The AnimationStateData to look up mix durations. */
    data: AnimationStateData;
    /** The list of tracks that have had animations. May contain null entries for tracks that currently have no animation. */
    readonly tracks: (TrackEntry | null)[];
    /** Multiplier for the delta time when the animation state is updated, causing time for all animations and mixes to play slower
     * or faster. Defaults to 1.
     *
     * See {@link TrackEntry.timeScale} to affect a single animation. */
    timeScale: number;
    unkeyedState: number;
    readonly events: Event[];
    readonly listeners: AnimationStateListener[];
    queue: EventQueue;
    propertyIds: Map<string, TrackEntry>;
    animationsChanged: boolean;
    trackEntryPool: Pool<TrackEntry>;
    constructor(data: AnimationStateData);
    /** Increments each track entry {@link TrackEntry.trackTime}, setting queued animations as current if needed. */
    update(delta: number): void;
    /** Returns true when all mixing from entries are complete. */
    updateMixingFrom(to: TrackEntry, delta: number): boolean;
    /** Poses the skeleton using the track entry animations. The animation state is not changed, so can be applied to multiple
     * skeletons to pose them identically.
     * @returns True if any animations were applied. */
    apply(skeleton: Skeleton): boolean;
    applyMixingFrom(to: TrackEntry, skeleton: Skeleton): number;
    /** Applies the attachment timeline and sets {@link Slot.attachmentState}.
     * @param retain True if the attachment remains after apply, false if temporary for deform timelines. */
    applyAttachmentTimeline(timeline: AttachmentTimeline, skeleton: Skeleton, time: number, from: MixFrom, retain: boolean): void;
    /** Applies the rotate timeline, mixing with the current pose while keeping the same rotation direction chosen as the shortest
     * the first time the mixing was applied. */
    applyRotateTimeline(timeline: RotateTimeline, skeleton: Skeleton, time: number, alpha: number, from: MixFrom, timelinesRotation: Array<number>, i: number, firstFrame: boolean): void;
    queueEvents(entry: TrackEntry, animationTime: number): void;
    private eventsReverse;
    /** Removes all animations from all tracks, leaving skeletons in their current pose.
     *
     * Usually you want to use {@link setEmptyAnimations} to mix the skeletons back to the setup pose, rather than leaving
     * them in their current pose. */
    clearTracks(): void;
    /** Removes all animations from the track, leaving skeletons in their current pose.
     *
     * Usually you want to use {@link setEmptyAnimation} to mix the skeletons back to the setup pose, rather than
     * leaving them in their current pose. */
    clearTrack(trackIndex: number): void;
    setTrack(index: number, current: TrackEntry, interrupt: boolean): void;
    /** Sets an animation by name.
     *
     * See {@link setAnimation}. */
    setAnimation(trackIndex: number, animationName: string, loop?: boolean): TrackEntry;
    /** Sets the current animation for a track, discarding any queued animations.
     *
     * If the formerly current track entry is for the same animation and was never applied to a skeleton, it is replaced (not mixed
     * from).
     * @param loop If true, the animation will repeat. If false it will not, instead its last frame is applied if played beyond its
     *           duration. In either case {@link TrackEntry.trackEnd} determines when the track is cleared.
     * @return A track entry to allow further customization of animation playback. References to the track entry must not be kept
     *         after the {@link AnimationStateListener.dispose} event occurs. */
    setAnimation(trackIndex: number, animation: Animation, loop?: boolean): TrackEntry;
    private setAnimation1;
    /** Sets the current animation for a track, discarding any queued animations.
     *
     * If the formerly current track entry is for the same animation and was never applied to a skeleton, it is replaced (not mixed
     * from).
     * @param loop If true, the animation will repeat. If false it will not, instead its last frame is applied if played beyond its
     *           duration. In either case {@link TrackEntry.getTrackEnd} determines when the track is cleared.
     * @return A track entry to allow further customization of animation playback. References to the track entry must not be kept
     *         after the {@link AnimationStateListener.dispose} event occurs. */
    private setAnimation2;
    /** Queues an animation by name.
     *
     * See {@link addAnimation}. */
    addAnimation(trackIndex: number, animationName: string, loop?: boolean, delay?: number): TrackEntry;
    /** Adds an animation to be played after the current or last queued animation for a track. If the track has no entries, this is
     * equivalent to calling {@link setAnimation}.
     * @param delay If > 0, sets {@link TrackEntry.delay}. If <= 0, the delay set is the duration of the previous track entry
     *           minus any mix duration (from {@link data}) plus the specified `delay` (ie the mix ends at (when
     *           `delay` = 0) or before (when `delay` < 0) the previous track entry duration). If the
     *           previous entry is looping, its next loop completion is used instead of its duration.
     * @return A track entry to allow further customization of animation playback. References to the track entry must not be kept
     *         after the {@link AnimationStateListener.dispose} event occurs. */
    addAnimation(trackIndex: number, animation: Animation, loop?: boolean, delay?: number): TrackEntry;
    private addAnimation1;
    private addAnimation2;
    /** Sets an empty animation for a track, discarding any queued animations, and sets the track entry's
     * {@link TrackEntry.mixduration}. An empty animation has no timelines and serves as a placeholder for mixing in or out.
     *
     * Mixing out is done by setting an empty animation with a mix duration using either {@link setEmptyAnimation},
     * {@link setEmptyAnimations}, or {@link addEmptyAnimation}. Mixing to an empty animation causes
     * the previous animation to be applied less and less over the mix duration. Properties keyed in the previous animation
     * transition to the value from lower tracks or to the setup pose value if no lower tracks key the property. A mix duration of
     * 0 still needs to be applied one more time to mix out, so the properties it was animating are reverted.
     *
     * Mixing in is done by first setting an empty animation, then adding an animation using
     * {@link addAnimation} with the desired delay (an empty animation has a duration of 0) and on
     * the returned track entry, set the {@link TrackEntry.setMixDuration}. Mixing from an empty animation causes the new
     * animation to be applied more and more over the mix duration. Properties keyed in the new animation transition from the value
     * from lower tracks or from the setup pose value if no lower tracks key the property to the value keyed in the new animation.
     *
     * See <a href='https://esotericsoftware.com/spine-applying-animations#Empty-animations'>Empty animations</a> in the Spine
     * Runtimes Guide. */
    setEmptyAnimation(trackIndex: number, mixDuration?: number): TrackEntry;
    /** Adds an empty animation to be played after the current or last queued animation for a track, and sets the track entry's
     * {@link TrackEntry.mixDuration}. If the track has no entries, it is equivalent to calling
     * {@link setEmptyAnimation}.
     *
     * See {@link setEmptyAnimation} and
     * <a href='https://esotericsoftware.com/spine-applying-animations#Empty-animations'>Empty animations</a> in the Spine Runtimes
     * Guide.
     * @param delay If > 0, sets {@link TrackEntry.delay}. If <= 0, the delay set is the duration of the previous track entry minus
     *           any mix duration plus the specified `delay` (ie the mix ends at (when `delay` = 0) or before
     *           (when `delay` < 0) the previous track entry duration). If the previous entry is looping, its next loop
     *           completion is used instead of its duration.
     * @return A track entry to allow further customization of animation playback. References to the track entry must not be kept
     *         after the {@link AnimationStateListener.dispose} event occurs. */
    addEmptyAnimation(trackIndex: number, mixDuration?: number, delay?: number): TrackEntry;
    /** Sets an empty animation for every track, discarding any queued animations, and mixes to it over the specified mix duration.
     *
     * See <a href='https://esotericsoftware.com/spine-applying-animations#Empty-animations'>Empty animations</a> in the Spine
     * Runtimes Guide. */
    setEmptyAnimations(mixDuration?: number): void;
    expandToIndex(index: number): TrackEntry | null;
    /** @param last May be null. */
    trackEntry(trackIndex: number, animation: Animation, loop: boolean, last: TrackEntry | null): TrackEntry;
    /** Removes {@link TrackEntry.next} and all entries after it for the specified entry. */
    clearNext(entry: TrackEntry): void;
    _animationsChanged(): void;
    computeHold(entry: TrackEntry, track: TrackEntry): void;
    private from;
    /** Returns the track entry for the animation currently playing on the track, or null if no animation is currently playing. */
    getTrack(trackIndex: number): TrackEntry | null;
    /** Adds a listener to receive events for all track entries. */
    addListener(listener: AnimationStateListener): void;
    /** Removes the listener added with {@link addListener}. */
    removeListener(listener: AnimationStateListener): void;
    /** Removes all listeners added with {@link addListener}. */
    clearListeners(): void;
    /** Discards all listener notifications that have not yet been delivered. This can be useful to call from an
     * {@link AnimationStateListener} when it is known that further notifications that may have been already queued for delivery
     * are not wanted because new animations are being set. */
    clearListenerNotifications(): void;
}
/** Stores settings and other state for the playback of an animation on an {@link AnimationState} track.
 *
 * References to a track entry must not be kept after the {@link AnimationStateListener.dispose} event occurs. */
export declare class TrackEntry {
    /** The animation to apply for this track entry. */
    animation: Animation | null;
    previous: TrackEntry | null;
    /** The animation queued to start after this animation, or null. `next` makes up a linked list. */
    next: TrackEntry | null;
    /** The track entry for the previous animation when mixing to this animation, or null if no mixing is currently occurring.
     * When mixing from multiple animations, `mixingFrom` makes up a doubly linked list. */
    mixingFrom: TrackEntry | null;
    /** The track entry for the next animation when mixing from this animation, or null if no mixing is currently occurring.
     * When mixing to multiple animations, `mixingTo` makes up a doubly linked list. */
    mixingTo: TrackEntry | null;
    /** The listener for events generated by this track entry, or null.
     *
     * A track entry returned from {@link AnimationState.setAnimation} is already the current animation
     * for the track, so the callback for listener {@link AnimationStateListener.start} will not be called. */
    listener: AnimationStateListener | null;
    /** The index of the track where this track entry is either current or queued.
     *
     * See {@link AnimationState.getTrack}. */
    trackIndex: number;
    /** If true, the animation will repeat. If false it will not, instead its last frame is applied if played beyond its
     * duration. */
    loop: boolean;
    /** When true, timelines in this animation that support additive have their values added to the setup or current pose values
     * instead of replacing them. Additive can be set for a new track entry only before {@link AnimationState.apply}
     * is next called. */
    additive: boolean;
    /** If true, the animation will be applied in reverse. */
    reverse: boolean;
    /** If true, mixing rotation between tracks always uses the shortest rotation direction. If the rotation is animated, the
     * shortest rotation direction may change during the mix.
     *
     * If false, the shortest rotation direction is remembered when the mix starts and the same direction is used for the rest
     * of the mix. Defaults to false.
     *
     * See {@link resetRotationDirections}. */
    shortestRotation: boolean;
    keepHold: boolean;
    /** When the interpolated mix percentage is less than the `eventThreshold` , event timelines are applied while
     * this animation is being mixed out. Defaults to 0, so event timelines are not applied while this animation is being mixed
     * out. */
    eventThreshold: number;
    /** When the interpolated mix percentage is less than the `mixAttachmentThreshold`, attachment timelines are
     * applied while this animation is being mixed out. Defaults to 0, so attachment timelines are not applied while this
     * animation is being mixed out. */
    mixAttachmentThreshold: number;
    /** When the computed alpha is greater than `alphaAttachmentThreshold`, attachment timelines are applied. The
     * computed alpha includes {@link alpha} and the interpolated mix percentage. Defaults to 0, so attachment timelines are
     * always applied. */
    alphaAttachmentThreshold: number;
    /** When the interpolated mix percentage is less than the `mixAttachmentThreshold`, attachment timelines are
     * applied while this animation is being mixed out. Defaults to 0, so attachment timelines are not applied while this
     * animation is being mixed out. */
    mixDrawOrderThreshold: number;
    /** The time in seconds for the first frame of this animation, both initially and after looping. Defaults to 0.
     *
     * When setting `animationStart` time, {@link animationLast} can be set to the same value to avoid firing events
     * from the start of the animation. */
    animationStart: number;
    /** The time in seconds for the last frame of this animation. Past this time, non-looping animations hold the pose at this
     * time while looping animations will loop back to {@link animationStart}. Defaults to the {@link Animation.duration}. */
    animationEnd: number;
    /** The time in seconds this animation was last applied. Some timelines use this for one-time triggers. For example, when
     * this animation is applied, event timelines will fire all events between the `animationLast` time (exclusive)
     * and `animationTime` (inclusive). Defaults to -1 to ensure triggers on frame 0 happen the first time this
     * animation is applied. */
    animationLast: number;
    nextAnimationLast: number;
    /** Seconds to postpone playing the animation. Must be >= 0. When this track entry is the current track entry,
     * `delay` postpones incrementing the {@link trackTime}. When this track entry is queued, `delay` is
     * the time from the start of the previous animation to when this track entry will become the current track entry (ie when
     * the previous track entry {@link trackTime} >= this track entry's `delay`).
     *
     * {@link timeScale} affects the delay.
     *
     * When passing `delay` <= 0 to {@link AnimationState.addAnimation} this
     * `delay` is set using a mix duration from {@link AnimationStateData}. To change the {@link mixDuration}
     * afterward, use {@link setMixDuration} so this `delay` is adjusted. */
    delay: number;
    /** The time in seconds this track entry has been the current track entry, starting at 0 and increasing forever. Compare to
     * {@link getAnimationTime}, which is always between {@link animationStart} and {@link animationEnd}.
     *
     * The track time can be set to start the animation at a time other than 0, without affecting looping. When doing so,
     * {@link animationLast} can be set to the same value to avoid firing events from the start of the animation.
     *
     * To set the time an animation starts and loops, use {@link animationStart} and {@link animationEnd}. */
    trackTime: number;
    trackLast: number;
    nextTrackLast: number;
    /** The track time in seconds when this animation will be removed from the track. Defaults to the highest possible float
     * value, meaning the animation will be applied until a new animation is set or the track is cleared. If the track end time
     * is reached, no other animations are queued for playback, and mixing from any previous animations is complete, then the
     * properties keyed by the animation are set to the setup pose and the track is cleared.
     *
     * Usually you want to use {@link AnimationState.addEmptyAnimation} rather than have the animation
     * abruptly cease being applied, leaving the current pose. */
    trackEnd: number;
    /** Multiplier for the delta time when this track entry is updated, causing time for this animation to pass slower or
     * faster. Defaults to 1.
     *
     * Values < 0 are not supported. To play an animation in reverse, use {@link reverse}.
     *
     * {@link mixTime} is not affected by track entry time scale, so {@link mixDuration} may need to be adjusted to match the
     * animation speed.
     *
     * When using {@link AnimationState.addAnimation} with a `delay` <= 0, the
     * {@link delay} is set using the mix duration from {@link AnimationState.data}, assuming time scale to be 1. If the time
     * scale is not 1, the delay may need to be adjusted.
     *
     * See {@link AnimationState.timeScale} to affect all animations. */
    timeScale: number;
    /** Values < 1 mix this animation with the skeleton's current pose (either the setup pose or the pose from lower tracks).
     * Defaults to 1, which overwrites the skeleton's current pose with this animation.
     *
     * Alpha should be 1 on track 0.
     *
     * See {@link getAlphaAttachmentThreshold}. */
    alpha: number;
    /** Seconds elapsed from 0 to the {@link mixDuration} when mixing from the previous animation to this animation. May
     * be slightly more than `mixDuration` when the mix is complete. */
    mixTime: number;
    /** Seconds for mixing from the previous animation to this animation. Defaults to the value provided by
     * {@link AnimationStateData.getMix} based on the animation before this animation (if any).
     *
     * A mix duration of 0 still needs to be applied one more time to mix out, so the the properties it was animating are
     * reverted. A mix duration of 0 can be set at any time to end the mix on the next
     * {@link AnimationState.update | update}.
     *
     * The `mixDuration` can be set manually rather than use the value from
     * {@link AnimationStateData.getMix}. In that case, the `mixDuration` can be set for a new
     * track entry only before {@link AnimationState.update} is next called.
     *
     * When using {@link AnimationState.addAnimation} with a `delay` <= 0, the
     * {@link getDelay} is set using the mix duration from {@link AnimationState.data}. If `mixDuration` is set
     * afterward, the delay needs to be adjusted:
     *
     * <pre>
     * entry.mixDuration = 0.25;<br>
     * entry.delay = entry.previous.getTrackComplete() - entry.mixDuration + 0;
     * </pre>
     *
     * Alternatively, use {@link setMixDuration} to set both the mix duration and recompute the delay:<br>
     *
     * <pre>
      entry.setMixDuration(0.25f, 0); // mixDuration, delay
     * </pre>
     */
    mixDuration: number;
    totalAlpha: number;
    mixInterpolation: Interpolation;
    /** Sets both {@link getMixDuration} and {@link getDelay}.
     * @param delay If > 0, sets {@link getDelay}. If <= 0, the delay set is the duration of the previous track entry minus
     *           the specified mix duration plus the specified `delay` (ie the mix ends at (when `delay` =
     *           0) or before (when `delay` < 0) the previous track entry duration). If the previous entry is
     *           looping, its next loop completion is used instead of its duration. */
    setMixDuration(mixDuration: number, delay?: number): void;
    /** The interpolation to apply to the mix percentage ({@link mixTime} / {@link mixDuration}) when mixing from the previous
     * animation to this animation. Defaults to linear. */
    setMixInterpolation(mixInterpolation: Interpolation): void;
    mix(): number;
    /** For each timeline:
     * - Bits 0-1: MixFrom.
     * - Bit 2, HOLD: 0 = mix out using alphaMix, 1 = apply full alpha to prevent dipping. Timeline is first on its track to
     * set the property and the next entry (mixingTo) also sets it. When held, timelineHoldMix's mix controls how the hold fades
     * out (for 3+ entry chains where the chain eventually stops setting the property). */
    timelineMode: number[];
    timelineHoldMix: TrackEntry[];
    timelinesRotation: number[];
    reset(): void;
    /** Uses {@link trackTime} to compute the `animationTime`, which is always between {@link animationStart} and
     * {@link animationEnd}. When `trackTime` is 0, `animationTime` is equal to the
     * `animationStart` time. */
    getAnimationTime(): number;
    setAnimationLast(animationLast: number): void;
    /** Returns true if at least one loop has been completed.
     *
     * See {@link AnimationStateListener.complete}. */
    isComplete(): boolean;
    /** When {@link shortestRotation} is false, this clears the directions for mixing this entry's rotation. This can be useful
     * to avoid bones rotating the long way around when using {@link getAlpha} and starting animations on other tracks.
     *
     * Mixing involves finding a rotation between two others. There are two possible solutions: the short or the long way
     * around. When the two rotations change over time, which direction is the short or long way can also change. If the short
     * way was always chosen, bones flip to the other side when that direction became the long way. TrackEntry chooses the short
     * way the first time it is applied and remembers that direction. Resetting that direction makes it choose a new short way
     * on the next apply. */
    resetRotationDirections(): void;
    /** If this track entry is non-looping, this is the track time in seconds when {@link animationEnd} is reached, or the
     * current {@link trackTime} if it has already been reached.
     *
     * If this track entry is looping, this is the track time when this animation will reach its next {@link animationEnd} (the
     * next loop completion). */
    getTrackComplete(): number;
    /** Returns true if this track entry has been applied at least once.
     *
     * See {@link AnimationState.apply}. */
    wasApplied(): boolean;
    /** Returns true if there is a {@link next} track entry and it will become the current track entry during the next
     * {@link AnimationState.update}. */
    isNextReady(): boolean;
}
export declare class EventQueue {
    objects: Array<EventType | TrackEntry | Event>;
    drainDisabled: boolean;
    animState: AnimationState;
    constructor(animState: AnimationState);
    start(entry: TrackEntry): void;
    interrupt(entry: TrackEntry): void;
    end(entry: TrackEntry): void;
    dispose(entry: TrackEntry): void;
    complete(entry: TrackEntry): void;
    event(entry: TrackEntry, event: Event): void;
    drain(): void;
    clear(): void;
}
export declare enum EventType {
    start = 0,
    interrupt = 1,
    end = 2,
    dispose = 3,
    complete = 4,
    event = 5
}
/** The interface to implement for receiving TrackEntry events. It is always safe to call AnimationState methods when receiving
 * events.
 *
 * TrackEntry events are collected during {@link AnimationState.update} and {@link AnimationState.apply} and
 * fired only after those methods are finished.
 *
 * See {@link TrackEntry.listener} and
 * {@link AnimationState.addListener}. */
export interface AnimationStateListener {
    /** Invoked when this entry has been set as the current entry. {@link end} will occur when this entry will no
     * longer be applied.
     *
     * When this event is triggered by calling {@link AnimationState.setAnimation}, take care not to
     * call {@link AnimationState.update} until after the TrackEntry has been configured. */
    start?: (entry: TrackEntry) => void;
    /** Invoked when another entry has replaced this entry as the current entry. This entry may continue being applied for
     * mixing. */
    interrupt?: (entry: TrackEntry) => void;
    /** Invoked when this entry will never be applied again. This only occurs if this entry has previously been set as the
     * current entry ({@link start} was invoked). */
    end?: (entry: TrackEntry) => void;
    /** Invoked when this entry will be disposed. This may occur without the entry ever being set as the current entry.
     * References to the entry should not be kept after dispose is called, as it may be destroyed or reused. */
    dispose?: (entry: TrackEntry) => void;
    /** Invoked every time this entry's animation completes a loop. This may occur during mixing (after
     * {@link interrupt}).
     *
     * If this entry's {@link TrackEntry.mixingTo} is not null, this entry is mixing out (it is not the current entry).
     *
     * Because this event is triggered at the end of {@link AnimationState.apply}, any animations set in response to
     * the event won't be applied until the next time the AnimationState is applied. */
    complete?: (entry: TrackEntry) => void;
    /** Invoked when this entry's animation triggers an event. */
    event?: (entry: TrackEntry, event: Event) => void;
}
export declare abstract class AnimationStateAdapter implements AnimationStateListener {
    start(entry: TrackEntry): void;
    interrupt(entry: TrackEntry): void;
    end(entry: TrackEntry): void;
    dispose(entry: TrackEntry): void;
    complete(entry: TrackEntry): void;
    event(entry: TrackEntry, event: Event): void;
}
export declare const CURRENT = 0;
export declare const SETUP = 1;
export declare const FIRST = 2;
export declare const MODE = 3;
export declare const HOLD = 4;
export declare const ATTACH_SETUP = 1;
export declare const ATTACH_RETAIN = 2;
